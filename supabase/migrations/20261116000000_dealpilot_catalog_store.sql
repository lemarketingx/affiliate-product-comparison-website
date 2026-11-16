-- DealPilot persistent catalog store.
-- Apply only to the DEDICATED DealPilot project, never to a mortgage project.
-- All access is server-side with the service role, through the dp_* functions
-- below (each takes and returns one jsonb value). anon/authenticated get nothing.
begin;

create table if not exists public.dp_products (
  source text not null default 'aliexpress' check (source = 'aliexpress'),
  product_id text not null check (product_id ~ '^[0-9]{4,24}$'),
  title text not null check (length(title) between 1 and 600),
  title_language text not null check (title_language in ('he', 'source')),
  brand text,
  supplier_brand text,
  shop_name text,
  category_slug text not null check (length(category_slug) between 1 and 40),
  category_label text not null check (length(category_label) between 1 and 80),
  image text check (image is null or image ~ '^https://'),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  product_url text check (product_url is null or product_url ~ '^https://'),
  affiliate_url text check (affiliate_url is null or affiliate_url ~ '^https://'),
  orders integer check (orders is null or orders >= 0),
  positive_feedback numeric(5, 2) check (positive_feedback is null or positive_feedback between 0 and 100),
  commission_rate text,
  status text not null check (status in ('published', 'rejected', 'unpublished')),
  reject_reasons text[] not null default '{}',
  manual_unpublished boolean not null default false,
  discovered_term text,
  first_seen_at timestamptz not null default now(),
  first_published_at timestamptz,
  last_seen_at timestamptz not null default now(),
  -- Current price = the latest provider observation, with where it came from.
  price numeric(12, 2) check (price is null or price > 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  price_field text,
  price_method text check (price_method is null or price_method in ('search', 'detail')),
  sku_id text,
  price_observed_at timestamptz,
  price_check_at timestamptz,
  price_missing_count integer not null default 0,
  primary key (source, product_id),
  -- A published row always has the data a listing needs.
  constraint dp_products_published_complete check (
    status <> 'published'
    or (image is not null and product_url is not null and affiliate_url is not null)
  )
);
create index if not exists dp_products_status_idx on public.dp_products (status, orders desc nulls last);
create index if not exists dp_products_first_published_idx on public.dp_products (first_published_at desc);
create index if not exists dp_products_price_check_idx on public.dp_products (price_check_at asc nulls first) where status = 'published';

create table if not exists public.dp_import_runs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('discover', 'price_refresh')),
  trigger text not null check (trigger in ('cron', 'manual', 'test')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error_codes jsonb not null default '{}'::jsonb
);
create index if not exists dp_import_runs_started_idx on public.dp_import_runs (started_at desc);

-- Append-only price history; `fields` keeps every raw provider price field.
create table if not exists public.dp_price_snapshots (
  id bigint generated always as identity primary key,
  source text not null default 'aliexpress',
  product_id text not null,
  observed_at timestamptz not null,
  method text not null check (method in ('search', 'detail')),
  run_id bigint references public.dp_import_runs (id),
  sku_id text,
  price_field text,
  price numeric(12, 2) check (price is null or price > 0),
  currency text,
  fields jsonb not null default '{}'::jsonb,
  foreign key (source, product_id) references public.dp_products (source, product_id) on delete cascade
);
create index if not exists dp_price_snapshots_product_idx on public.dp_price_snapshots (product_id, observed_at desc);

create table if not exists public.dp_import_events (
  id bigint generated always as identity primary key,
  run_id bigint references public.dp_import_runs (id),
  at timestamptz not null default now(),
  level text not null check (level in ('info', 'warn', 'error')),
  code text not null check (length(code) between 1 and 80),
  term text,
  product_id text,
  detail text check (detail is null or length(detail) <= 500)
);
create index if not exists dp_import_events_at_idx on public.dp_import_events (at desc);

-- Where each search term continues next run (resumable across serverless calls).
create table if not exists public.dp_term_cursors (
  term_key text primary key check (length(term_key) between 1 and 160),
  term text not null,
  category_slug text not null,
  category_label text not null,
  next_page integer not null default 1 check (next_page between 1 and 100),
  active boolean not null default true,
  last_run_at timestamptz,
  exhausted_at timestamptz,
  last_total integer
);

create table if not exists public.dp_click_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null check (product_id ~ '^[0-9]{4,24}$'),
  source text not null check (source in ('catalog', 'telegram', 'facebook', 'instagram', 'other')),
  page text check (page is null or length(page) <= 120)
);
create index if not exists dp_click_events_created_idx on public.dp_click_events (created_at desc);

alter table public.dp_products enable row level security;
alter table public.dp_import_runs enable row level security;
alter table public.dp_price_snapshots enable row level security;
alter table public.dp_import_events enable row level security;
alter table public.dp_term_cursors enable row level security;
alter table public.dp_click_events enable row level security;
revoke all on public.dp_products, public.dp_import_runs, public.dp_price_snapshots,
  public.dp_import_events, public.dp_term_cursors, public.dp_click_events
  from public, anon, authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public.dp_num(v text) returns numeric
language sql immutable set search_path = public as $$
  select case when v ~ '^[0-9]{1,9}(\.[0-9]{1,4})?$' and v::numeric > 0 then round(v::numeric, 2) end
$$;

-- ---------------------------------------------------------------- runs
create or replace function public.dp_start_run(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare rid bigint;
begin
  -- A run whose function was killed never finishes: close it as failed.
  update dp_import_runs set status = 'failed', finished_at = now(),
    error_codes = error_codes || '{"RUN_ABANDONED":1}'::jsonb
  where status = 'running' and started_at < now() - interval '30 minutes';
  insert into dp_import_runs (kind, trigger) values (p->>'kind', coalesce(p->>'trigger', 'manual'))
  returning id into rid;
  return jsonb_build_object('id', rid);
end $$;

create or replace function public.dp_finish_run(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
begin
  update dp_import_runs set status = p->>'status', finished_at = now(),
    stats = coalesce(p->'stats', '{}'::jsonb), error_codes = coalesce(p->'error_codes', '{}'::jsonb)
  where id = (p->>'id')::bigint and status = 'running';
  if not found then raise exception 'RUN_NOT_RUNNING'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dp_log_events(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare n integer;
begin
  insert into dp_import_events (run_id, level, code, term, product_id, detail)
  select (p->>'run_id')::bigint, e->>'level', left(e->>'code', 80), left(e->>'term', 160),
    left(e->>'product_id', 24), left(e->>'detail', 500)
  from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) e;
  get diagnostics n = row_count;
  return jsonb_build_object('logged', n);
end $$;

-- ---------------------------------------------------------------- term cursors
create or replace function public.dp_sync_terms(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
begin
  insert into dp_term_cursors (term_key, term, category_slug, category_label)
  select t->>'key', t->>'term', t->>'category_slug', t->>'category_label'
  from jsonb_array_elements(p->'terms') t
  on conflict (term_key) do update set term = excluded.term, category_slug = excluded.category_slug,
    category_label = excluded.category_label, active = true;
  update dp_term_cursors set active = false
  where term_key not in (select t->>'key' from jsonb_array_elements(p->'terms') t);
  return jsonb_build_object('ok', true);
end $$;

-- Terms to fetch next: never-run first, then least recently run. An exhausted
-- term starts again from page 1 after `reset_after_days`.
create or replace function public.dp_next_terms(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare days integer := coalesce((p->>'reset_after_days')::integer, 7);
begin
  update dp_term_cursors set exhausted_at = null, next_page = 1
  where exhausted_at is not null and exhausted_at < now() - make_interval(days => days);
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', term_key, 'term', term, 'category_slug', category_slug,
      'category_label', category_label, 'page', next_page) order by last_run_at asc nulls first, term_key)
    from (select * from dp_term_cursors where active and exhausted_at is null
          order by last_run_at asc nulls first, term_key limit coalesce((p->>'limit')::integer, 20)) t
  ), '[]'::jsonb);
end $$;

create or replace function public.dp_advance_term(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare pg integer := (p->>'page')::integer; maxp integer := coalesce((p->>'max_page')::integer, 100);
begin
  update dp_term_cursors set last_run_at = now(), last_total = coalesce((p->>'total')::integer, last_total),
    next_page = case when (p->>'full')::boolean and pg < maxp then pg + 1 else 1 end,
    exhausted_at = case when (p->>'full')::boolean and pg < maxp then null else now() end
  where term_key = p->>'key';
  return jsonb_build_object('ok', found);
end $$;

-- ---------------------------------------------------------------- ingest
-- Upsert by (source, product_id): a product is never inserted twice. The first
-- term that found a product keeps its category. A manual unpublish sticks.
create or replace function public.dp_ingest(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare
  it jsonb; cur dp_products%rowtype; new_price numeric; new_status text;
  observed timestamptz := coalesce((p->>'observed_at')::timestamptz, now());
  inserted integer := 0; updated integer := 0; published_new integer := 0; snaps integer := 0;
begin
  for it in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    new_price := dp_num(it->>'price');
    new_status := it->>'status';
    select * into cur from dp_products where source = 'aliexpress' and product_id = it->>'product_id' for update;
    if not found then
      insert into dp_products (product_id, title, title_language, brand, supplier_brand, shop_name,
        category_slug, category_label, image, images, product_url, affiliate_url, orders,
        positive_feedback, commission_rate, status, reject_reasons, discovered_term,
        first_seen_at, first_published_at, last_seen_at,
        price, currency, price_field, price_method, sku_id, price_observed_at)
      values (it->>'product_id', it->>'title', it->>'title_language', it->>'brand', it->>'supplier_brand',
        it->>'shop_name', it->>'category_slug', it->>'category_label', it->>'image',
        coalesce(it->'images', '[]'::jsonb), it->>'product_url', it->>'affiliate_url',
        (it->>'orders')::integer, (it->>'positive_feedback')::numeric, it->>'commission_rate',
        new_status, coalesce(array(select jsonb_array_elements_text(it->'reject_reasons')), '{}'),
        it->>'term', observed, case when new_status = 'published' then observed end, observed,
        new_price, case when new_price is not null then it->>'currency' end,
        case when new_price is not null then it->>'price_field' end,
        case when new_price is not null then 'search' end, it->>'sku_id',
        case when new_price is not null then observed end);
      inserted := inserted + 1;
      if new_status = 'published' then published_new := published_new + 1; end if;
    else
      if cur.manual_unpublished then new_status := 'unpublished'; end if;
      update dp_products set title = it->>'title', title_language = it->>'title_language',
        brand = it->>'brand', supplier_brand = it->>'supplier_brand', shop_name = it->>'shop_name',
        image = it->>'image', images = coalesce(it->'images', '[]'::jsonb), product_url = it->>'product_url',
        affiliate_url = it->>'affiliate_url', orders = (it->>'orders')::integer,
        positive_feedback = (it->>'positive_feedback')::numeric, commission_rate = it->>'commission_rate',
        status = new_status,
        reject_reasons = coalesce(array(select jsonb_array_elements_text(it->'reject_reasons')), '{}'),
        first_published_at = coalesce(first_published_at, case when new_status = 'published' then observed end),
        last_seen_at = observed,
        price = coalesce(new_price, price),
        currency = case when new_price is not null then it->>'currency' else currency end,
        price_field = case when new_price is not null then it->>'price_field' else price_field end,
        price_method = case when new_price is not null then 'search' else price_method end,
        sku_id = case when new_price is not null then it->>'sku_id' else sku_id end,
        price_observed_at = case when new_price is not null then observed else price_observed_at end
      where source = 'aliexpress' and product_id = cur.product_id;
      updated := updated + 1;
      if new_status = 'published' and cur.first_published_at is null then published_new := published_new + 1; end if;
    end if;
    -- History: a search observation is appended when the quote changed or the
    -- last one is older than 20 hours (keeps the table small but continuous).
    if new_price is not null and (cur.product_id is null or cur.price is distinct from new_price
        or cur.currency is distinct from it->>'currency' or cur.sku_id is distinct from it->>'sku_id'
        or cur.price_observed_at is null or cur.price_observed_at < observed - interval '20 hours') then
      insert into dp_price_snapshots (product_id, observed_at, method, run_id, sku_id, price_field, price, currency, fields)
      values (it->>'product_id', observed, 'search', (p->>'run_id')::bigint, it->>'sku_id', it->>'price_field',
        new_price, it->>'currency', coalesce(it->'price_fields', '{}'::jsonb));
      snaps := snaps + 1;
    end if;
    cur := null;
  end loop;
  return jsonb_build_object('inserted', inserted, 'updated', updated, 'published_new', published_new, 'snapshots', snaps);
end $$;

-- ---------------------------------------------------------------- prices
create or replace function public.dp_due_for_price(p jsonb) returns jsonb
language sql set search_path = public as $$
  select coalesce(jsonb_agg(product_id), '[]'::jsonb) from (
    select product_id from dp_products
    where status = 'published'
      and (price_check_at is null or price_check_at < now() - make_interval(hours => coalesce((p->>'min_age_hours')::integer, 20)))
    order by price_check_at asc nulls first, orders desc nulls last
    limit coalesce((p->>'limit')::integer, 100)) t
$$;

-- Detail observations always go to history. A product the detail endpoint
-- stops returning 3 checks in a row is unpublished automatically (logged).
create or replace function public.dp_record_prices(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare
  o jsonb; v numeric; observed timestamptz := coalesce((p->>'observed_at')::timestamptz, now());
  ok integer := 0; missing integer := 0; invalid integer := 0; unpublished integer := 0; rid bigint := (p->>'run_id')::bigint;
  mid text; became boolean;
begin
  for o in select * from jsonb_array_elements(coalesce(p->'observations', '[]'::jsonb)) loop
    v := dp_num(o->>'price');
    if v is null or coalesce(o->>'currency', '') !~ '^[A-Z]{3}$' then
      update dp_products set price_check_at = observed where product_id = o->>'product_id';
      invalid := invalid + 1;
      continue;
    end if;
    update dp_products set price = v, currency = o->>'currency', price_field = o->>'price_field',
      price_method = 'detail', sku_id = o->>'sku_id', price_observed_at = observed,
      price_check_at = observed, price_missing_count = 0
    where source = 'aliexpress' and product_id = o->>'product_id';
    if found then
      insert into dp_price_snapshots (product_id, observed_at, method, run_id, sku_id, price_field, price, currency, fields)
      values (o->>'product_id', observed, 'detail', rid, o->>'sku_id', o->>'price_field', v, o->>'currency',
        coalesce(o->'price_fields', '{}'::jsonb));
      ok := ok + 1;
    end if;
  end loop;
  for mid in select jsonb_array_elements_text(coalesce(p->'missing', '[]'::jsonb)) loop
    update dp_products set price_check_at = observed, price_missing_count = price_missing_count + 1,
      status = case when price_missing_count + 1 >= 3 and status = 'published' then 'unpublished' else status end,
      reject_reasons = case when price_missing_count + 1 >= 3 and status = 'published'
        then array_append(reject_reasons, 'detail_missing') else reject_reasons end
    where source = 'aliexpress' and product_id = mid
    returning (status = 'unpublished' and price_missing_count = 3 and not manual_unpublished) into became;
    missing := missing + 1;
    if coalesce(became, false) then
      became := false;
      unpublished := unpublished + 1;
      insert into dp_import_events (run_id, level, code, product_id, detail)
      values (rid, 'warn', 'AUTO_UNPUBLISHED_DETAIL_MISSING', mid, 'Not returned by productdetail.get in 3 consecutive checks');
    end if;
  end loop;
  return jsonb_build_object('updated', ok, 'missing', missing, 'invalid', invalid, 'unpublished', unpublished);
end $$;

-- ---------------------------------------------------------------- reads
create or replace function public.dp_catalog(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.orders desc nulls last, t.product_id), '[]'::jsonb) from (
    select product_id, title, title_language, brand, supplier_brand, shop_name, category_slug, category_label,
      image, images, product_url, affiliate_url, orders, positive_feedback, commission_rate,
      price, currency, price_field, price_method, sku_id, price_observed_at, first_published_at, last_seen_at
    from dp_products where status = 'published'
    order by orders desc nulls last, product_id
    limit coalesce((p->>'limit')::integer, 2000)) t
$$;

create or replace function public.dp_price_history(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('observed_at', observed_at, 'method', method, 'price', price,
    'currency', currency, 'price_field', price_field, 'sku_id', sku_id) order by observed_at), '[]'::jsonb)
  from (select * from dp_price_snapshots where product_id = p->>'product_id'
        order by observed_at desc limit coalesce((p->>'limit')::integer, 90)) s
$$;

create or replace function public.dp_set_unpublished(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare on_ boolean := (p->>'unpublished')::boolean;
begin
  update dp_products set manual_unpublished = on_,
    status = case when on_ then 'unpublished'
                  when cardinality(array_remove(reject_reasons, 'detail_missing')) = 0 then 'published'
                  else 'rejected' end,
    first_published_at = case when not on_ and cardinality(array_remove(reject_reasons, 'detail_missing')) = 0
                  then coalesce(first_published_at, now()) else first_published_at end
  where source = 'aliexpress' and product_id = p->>'product_id';
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dp_record_click(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
begin
  insert into dp_click_events (product_id, source, page) values (p->>'product_id', p->>'source', left(p->>'page', 120));
  return jsonb_build_object('ok', true);
end $$;

-- Operations summary for the admin dashboard. Days are Israel calendar days.
create or replace function public.dp_dashboard(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  with day as (select (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as start),
  stale as (select make_interval(hours => coalesce((p->>'price_max_age_hours')::integer, 48)) as age)
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
        'all', count(*),
        'published', count(*) filter (where status = 'published'),
        'rejected', count(*) filter (where status = 'rejected'),
        'unpublished', count(*) filter (where status = 'unpublished'),
        'published_today', count(*) filter (where first_published_at >= (select start from day)),
        'published_without_current_price', count(*) filter (where status = 'published'
          and (price is null or price_observed_at is null or price_observed_at < now() - (select age from stale))),
        'published_detail_checked', count(*) filter (where status = 'published' and price_method = 'detail'))
      from dp_products),
    'reject_reasons', (select coalesce(jsonb_object_agg(r, n), '{}'::jsonb) from (
        select r, count(*) n from dp_products, unnest(reject_reasons) r where status <> 'published' group by r) x),
    'runs', (select coalesce(jsonb_agg(to_jsonb(r) order by r.started_at desc), '[]'::jsonb) from (
        select id, kind, trigger, status, started_at, finished_at, stats, error_codes
        from dp_import_runs order by started_at desc limit 12) r),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.at desc), '[]'::jsonb) from (
        select at, level, code, term, product_id, detail, run_id from dp_import_events
        where level <> 'info' order by at desc limit 25) e),
    -- Latest search quote vs latest detail quote for the same product.
    'price_gaps', (select coalesce(jsonb_agg(to_jsonb(g) order by g.gap_pct desc), '[]'::jsonb) from (
        select s.product_id, pr.title, s.price as search_price, s.currency as search_currency,
          s.sku_id as search_sku, s.observed_at as search_at, d.price as detail_price, d.currency as detail_currency,
          d.sku_id as detail_sku, d.observed_at as detail_at, d.price_field,
          round(abs(d.price - s.price) / s.price * 100, 1) as gap_pct,
          s.fields as search_fields, d.fields as detail_fields
        from (select distinct on (product_id) * from dp_price_snapshots where method = 'search' order by product_id, observed_at desc) s
        join (select distinct on (product_id) * from dp_price_snapshots where method = 'detail' order by product_id, observed_at desc) d using (product_id)
        join dp_products pr using (product_id)
        where s.currency is distinct from d.currency or abs(d.price - s.price) / s.price > 0.02
        order by gap_pct desc limit 30) g),
    'clicks_30d', (select jsonb_build_object('total', count(*),
        'by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from dp_click_events
          where created_at > now() - interval '30 days' group by source) s), '{}'::jsonb),
        'top_products', coalesce((select jsonb_agg(jsonb_build_object('product_id', product_id, 'clicks', n)) from (
          select product_id, count(*) n from dp_click_events where created_at > now() - interval '30 days'
          group by product_id order by n desc limit 10) t), '[]'::jsonb))
      from dp_click_events where created_at > now() - interval '30 days')
  )
$$;

do $$
declare f text;
begin
  foreach f in array array['dp_num(text)', 'dp_start_run(jsonb)', 'dp_finish_run(jsonb)', 'dp_log_events(jsonb)',
    'dp_sync_terms(jsonb)', 'dp_next_terms(jsonb)', 'dp_advance_term(jsonb)', 'dp_ingest(jsonb)',
    'dp_due_for_price(jsonb)', 'dp_record_prices(jsonb)', 'dp_catalog(jsonb)', 'dp_price_history(jsonb)',
    'dp_set_unpublished(jsonb)', 'dp_record_click(jsonb)', 'dp_dashboard(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant select, insert, update, delete on public.dp_products, public.dp_import_runs, public.dp_price_snapshots,
  public.dp_import_events, public.dp_term_cursors, public.dp_click_events to service_role;
grant usage, select on all sequences in schema public to service_role;

commit;
