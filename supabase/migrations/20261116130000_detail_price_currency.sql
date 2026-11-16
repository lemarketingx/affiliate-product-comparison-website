-- Product-detail price refresh: currency-safe recording (2026-11-16).
-- productdetail.get is now called with USD (ILS is rejected there), while the
-- storefront price comes from the ILS search quote. A USD detail quote must
-- never overwrite an ILS price as if it were ILS:
--   * same currency as the stored price  -> normal update (method 'detail');
--   * stored ILS, detail USD, and the USD price equals the USD sale_price kept
--     with the latest search quote (same SKU when both known) -> the ILS quote
--     is confirmed as current (method 'confirmed');
--   * otherwise the USD price changed or cannot be compared -> the fresh USD
--     quote replaces the price, labelled USD (method 'detail').
-- Every detail observation is still appended to history. Additive only.
begin;

alter table public.dp_products drop constraint if exists dp_products_price_method_check;
alter table public.dp_products add constraint dp_products_price_method_check
  check (price_method is null or price_method in ('search', 'detail', 'confirmed'));

create or replace function public.dp_record_prices(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare
  o jsonb; v numeric; observed timestamptz := coalesce((p->>'observed_at')::timestamptz, now());
  ok integer := 0; confirmed integer := 0; missing integer := 0; invalid integer := 0; unpublished integer := 0;
  rid bigint := (p->>'run_id')::bigint; mid text; became boolean;
  cur dp_products%rowtype; s dp_price_snapshots%rowtype; s_usd numeric;
begin
  for o in select * from jsonb_array_elements(coalesce(p->'observations', '[]'::jsonb)) loop
    v := dp_num(o->>'price');
    select * into cur from dp_products where source = 'aliexpress' and product_id = o->>'product_id' for update;
    if not found then continue; end if;
    if v is null or coalesce(o->>'currency', '') !~ '^[A-Z]{3}$' then
      update dp_products set price_check_at = observed where product_id = cur.product_id;
      invalid := invalid + 1;
      continue;
    end if;
    insert into dp_price_snapshots (product_id, observed_at, method, run_id, sku_id, price_field, price, currency, fields)
    values (cur.product_id, observed, 'detail', rid, o->>'sku_id', o->>'price_field', v, o->>'currency',
      coalesce(o->'price_fields', '{}'::jsonb));
    if cur.currency is null or cur.currency = o->>'currency' then
      update dp_products set price = v, currency = o->>'currency', price_field = o->>'price_field',
        price_method = 'detail', sku_id = o->>'sku_id', price_observed_at = observed,
        price_check_at = observed, price_missing_count = 0
      where product_id = cur.product_id;
      ok := ok + 1;
      continue;
    end if;
    select * into s from dp_price_snapshots where product_id = cur.product_id and method = 'search'
      order by observed_at desc limit 1;
    s_usd := case when s.fields->>'salePriceCurrency' = o->>'currency' then dp_num(s.fields->>'salePrice') end;
    if s_usd is not null and abs(s_usd - v) <= greatest(0.01, v * 0.005)
       and (s.sku_id is null or o->>'sku_id' is null or s.sku_id = o->>'sku_id') then
      -- Same provider price as when the ILS quote was taken: the ILS quote is still current.
      update dp_products set price_method = 'confirmed', price_observed_at = observed,
        price_check_at = observed, price_missing_count = 0
      where product_id = cur.product_id;
      confirmed := confirmed + 1;
    else
      update dp_products set price = v, currency = o->>'currency', price_field = o->>'price_field',
        price_method = 'detail', sku_id = o->>'sku_id', price_observed_at = observed,
        price_check_at = observed, price_missing_count = 0
      where product_id = cur.product_id;
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
  return jsonb_build_object('updated', ok, 'confirmed', confirmed, 'missing', missing, 'invalid', invalid, 'unpublished', unpublished);
end $$;

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
        'published_detail_checked', count(*) filter (where status = 'published' and price_method in ('detail', 'confirmed')))
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
    -- Latest search quote vs latest detail quote, compared in ONE currency:
    -- the search row's own price when currencies match, else the search row's
    -- raw USD sale_price when the detail quote is USD. Otherwise not comparable.
    'price_gaps', (select coalesce(jsonb_agg(to_jsonb(g) order by g.gap_pct desc nulls last), '[]'::jsonb) from (
        select x.*, case when x.cmp_price is not null then round(abs(x.detail_price - x.cmp_price) / x.cmp_price * 100, 1) end as gap_pct
        from (
          select s.product_id, pr.title, s.price as search_price, s.currency as search_currency,
            s.sku_id as search_sku, s.observed_at as search_at, d.price as detail_price, d.currency as detail_currency,
            d.sku_id as detail_sku, d.observed_at as detail_at, d.price_field,
            case when s.currency = d.currency then s.price
                 when s.fields->>'salePriceCurrency' = d.currency then dp_num(s.fields->>'salePrice') end as cmp_price,
            s.fields as search_fields, d.fields as detail_fields
          from (select distinct on (product_id) * from dp_price_snapshots where method = 'search' order by product_id, observed_at desc) s
          join (select distinct on (product_id) * from dp_price_snapshots where method = 'detail' order by product_id, observed_at desc) d using (product_id)
          join dp_products pr using (product_id)) x
        where x.cmp_price is null or abs(x.detail_price - x.cmp_price) / x.cmp_price > 0.005
        order by gap_pct desc nulls last limit 30) g),
    'clicks_30d', (select jsonb_build_object('total', count(*),
        'by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from dp_click_events
          where created_at > now() - interval '30 days' group by source) s), '{}'::jsonb),
        'top_products', coalesce((select jsonb_agg(jsonb_build_object('product_id', product_id, 'clicks', n)) from (
          select product_id, count(*) n from dp_click_events where created_at > now() - interval '30 days'
          group by product_id order by n desc limit 10) t), '[]'::jsonb))
      from dp_click_events where created_at > now() - interval '30 days')
  )
$$;

revoke all on function public.dp_record_prices(jsonb) from public, anon, authenticated;
grant execute on function public.dp_record_prices(jsonb) to service_role;
revoke all on function public.dp_dashboard(jsonb) from public, anon, authenticated;
grant execute on function public.dp_dashboard(jsonb) to service_role;

commit;
