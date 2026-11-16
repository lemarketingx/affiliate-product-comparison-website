-- Affiliate link verification (2026-11-16). Additive.
-- A daily job follows a few stored promotion links (redirects only, the
-- product page is never loaded) and records whether each reaches the SAME
-- product id on AliExpress with affiliate parameters intact.
--   ok             -> recorded
--   broken         -> recorded only (network, HTTP error, or inconclusive)
--   wrong_product / not_aliexpress -> unpublished automatically (definitive:
--                     seen in a real HTTP redirect), logged as a warning.
begin;

alter table public.dp_products
  add column if not exists link_status text check (link_status is null or link_status in ('ok', 'wrong_product', 'not_aliexpress', 'broken')),
  add column if not exists link_checked_at timestamptz,
  add column if not exists link_detail jsonb;
create index if not exists dp_products_link_check_idx on public.dp_products (link_checked_at asc nulls first) where status = 'published';

do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.dp_import_runs'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%';
  if c is not null then execute format('alter table public.dp_import_runs drop constraint %I', c); end if;
end $$;
alter table public.dp_import_runs add constraint dp_import_runs_kind_check
  check (kind in ('discover', 'price_refresh', 'link_check'));

create or replace function public.dp_due_for_link_check(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'affiliate_url', affiliate_url)), '[]'::jsonb)
  from (select product_id, affiliate_url from dp_products
        where status = 'published' and affiliate_url is not null
          and (link_checked_at is null or link_checked_at < now() - make_interval(days => coalesce((p->>'min_age_days')::integer, 7)))
        order by link_checked_at asc nulls first, orders desc nulls last
        limit coalesce((p->>'limit')::integer, 10)) t
$$;

create or replace function public.dp_record_link_checks(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare r jsonb; st text; n_ok integer := 0; n_broken integer := 0; n_unpub integer := 0; rid bigint := (p->>'run_id')::bigint;
begin
  for r in select * from jsonb_array_elements(coalesce(p->'results', '[]'::jsonb)) loop
    st := r->>'status';
    if st not in ('ok', 'wrong_product', 'not_aliexpress', 'broken') then continue; end if;
    update dp_products set link_status = st, link_checked_at = now(),
      link_detail = jsonb_build_object('hops', r->'hops', 'final_host', r->'finalHost',
        'final_product_id', r->'finalProductId', 'aff_params', r->'affParams', 'detail', r->'detail'),
      status = case when st in ('wrong_product', 'not_aliexpress') and status = 'published' then 'unpublished' else status end,
      reject_reasons = case when st in ('wrong_product', 'not_aliexpress') and status = 'published'
        then array_append(reject_reasons, 'link_' || st) else reject_reasons end
    where source = 'aliexpress' and product_id = r->>'product_id';
    if st = 'ok' then n_ok := n_ok + 1;
    elsif st = 'broken' then n_broken := n_broken + 1;
    else
      n_unpub := n_unpub + 1;
      insert into dp_import_events (run_id, level, code, product_id, detail)
      values (rid, 'warn', 'AUTO_UNPUBLISHED_LINK_' || upper(st), r->>'product_id', left(coalesce(r->>'detail', st), 500));
    end if;
  end loop;
  return jsonb_build_object('ok', n_ok, 'broken', n_broken, 'unpublished', n_unpub);
end $$;

create or replace function public.dp_link_summary(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'published', count(*) filter (where status = 'published'),
    'checked', count(*) filter (where status = 'published' and link_checked_at is not null),
    'ok', count(*) filter (where status = 'published' and link_status = 'ok'),
    'broken', count(*) filter (where status = 'published' and link_status = 'broken'),
    'with_aff_params', count(*) filter (where status = 'published' and link_status = 'ok'
      and jsonb_array_length(coalesce(link_detail->'aff_params', '[]'::jsonb)) > 0),
    'unpublished_by_link', count(*) filter (where reject_reasons && array['link_wrong_product', 'link_not_aliexpress']),
    'last_checked_at', max(link_checked_at))
  from dp_products
$$;

do $$
declare f text;
begin
  foreach f in array array['dp_due_for_link_check(jsonb)', 'dp_record_link_checks(jsonb)', 'dp_link_summary(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

commit;
