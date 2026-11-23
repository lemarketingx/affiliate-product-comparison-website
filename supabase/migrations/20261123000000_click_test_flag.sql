-- Test clicks are kept (never deleted) but excluded from click reports.
-- Additive: one column with a false default, and dp_dashboard re-created from
-- 20261116130000 with `and not is_test` on its three click reads. Which rows are
-- tests is a data decision made per environment (UPDATE), never in a migration.
begin;

alter table public.dp_click_events add column if not exists is_test boolean not null default false;

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
          where created_at > now() - interval '30 days' and not is_test group by source) s), '{}'::jsonb),
        'top_products', coalesce((select jsonb_agg(jsonb_build_object('product_id', product_id, 'clicks', n)) from (
          select product_id, count(*) n from dp_click_events where created_at > now() - interval '30 days' and not is_test
          group by product_id order by n desc limit 10) t), '[]'::jsonb))
      from dp_click_events where created_at > now() - interval '30 days' and not is_test)
  )
$$;

revoke all on function public.dp_dashboard(jsonb) from public, anon, authenticated;
grant execute on function public.dp_dashboard(jsonb) to service_role;

commit;
