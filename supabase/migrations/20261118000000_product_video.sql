-- Seller product videos (`product_video_url` from product.query / productdetail.get).
-- Non-destructive: one nullable column, one small writer, dp_catalog returns the column.
-- dp_ingest and dp_record_prices are deliberately NOT replaced: the job calls
-- dp_set_videos after them, so the existing write paths stay exactly as they are.
alter table public.dp_products add column if not exists video_url text;

-- p = {"items": [{"product_id": "...", "video_url": "https://..."}]}
-- Only sets a validated https URL; a missing video never clears a stored one
-- (the provider omits the field in some responses).
create or replace function public.dp_set_videos(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare n integer;
begin
  update dp_products d set video_url = x.video_url
  from (
    select it->>'product_id' as product_id, it->>'video_url' as video_url
    from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) it
    where coalesce(it->>'video_url', '') ~ '^https://[^\s"''<>]+$' and length(it->>'video_url') <= 1000
  ) x
  where d.source = 'aliexpress' and d.product_id = x.product_id
    and d.video_url is distinct from x.video_url;
  get diagnostics n = row_count;
  return jsonb_build_object('updated', n);
end $$;

revoke all on function public.dp_set_videos(jsonb) from public, anon, authenticated;
grant execute on function public.dp_set_videos(jsonb) to service_role;

create or replace function public.dp_catalog(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.orders desc nulls last, t.product_id), '[]'::jsonb) from (
    select product_id, title, title_language, brand, supplier_brand, shop_name, category_slug, category_label,
      -- At most 4 images per product keeps the cached list payload small.
      image, jsonb_path_query_array(images, '$[0 to 3]') as images, video_url, product_url, affiliate_url, orders,
      positive_feedback, commission_rate,
      price, currency, price_field, price_method, sku_id, price_observed_at, first_published_at, last_seen_at
    from dp_products where status = 'published'
    order by orders desc nulls last, product_id
    limit least(coalesce((p->>'limit')::integer, 1200), 2000)) t
$$;
