// Explicit Node preload for the isolated catalog-store e2e server (port 3105) only.
// It answers the Supabase PostgREST RPC endpoint (`POST /rest/v1/rpc/<fn>`) from an
// in-process pglite database loaded with the REAL migration, so the server code
// (supabase-js client, { p } argument contract, jobs, reads) runs unmodified.
// Never imported by application code. TEST FIXTURE data only.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const HOST = "https://fixture-only.supabase.co";
if (
  process.env.NEXTAUTH_URL !== "http://127.0.0.1:3105" ||
  process.env.DEALPILOT_SUPABASE_URL !== HOST ||
  process.env.DEALPILOT_SUPABASE_SERVICE_ROLE_KEY !== "fixture-only-never-real"
) {
  throw new Error("Store fixture requires the isolated local test server and fake credentials");
}

const db = new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role;");
// Every migration, in order — exactly what the real project receives.
const dir = new URL("../../supabase/migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
// One published product whose last price is 5 days old: it must never be shown as current.
await db.exec(`insert into dp_products (product_id, title, title_language, brand, shop_name, category_slug, category_label,
  image, images, product_url, affiliate_url, orders, status, first_seen_at, first_published_at, last_seen_at,
  price, currency, price_field, price_method, price_observed_at, price_check_at)
  values ('1005000000777', 'TEST FIXTURE — Baseus מטען ישן עם מחיר לא עדכני', 'he', 'Baseus', 'Baseus Store', 'tech', 'טכנולוגיה וטעינה',
  'https://ae01.alicdn.com/kf/dealpilot-fixture-stale.jpg', '["https://ae01.alicdn.com/kf/dealpilot-fixture-stale.jpg"]',
  'https://www.aliexpress.com/item/1005000000777.html', 'https://s.click.aliexpress.com/e/TEST_STALE_777', 90000, 'published',
  now() - interval '6 days', now() - interval '6 days', now() - interval '5 days',
  77.70, 'ILS', 'target_sale_price', 'search', now() - interval '5 days', null)`);

// One published product with a current ILS price and stored observations: the product page
// charts only the same currency and variant (the USD row and the other SKU are not drawn).
await db.exec(`insert into dp_products (product_id, title, title_language, brand, shop_name, category_slug, category_label,
  image, images, product_url, affiliate_url, orders, status, first_seen_at, first_published_at, last_seen_at,
  price, currency, price_field, price_method, sku_id, price_observed_at, price_check_at)
  values ('1005000000888', 'TEST FIXTURE — Baseus מטען עם היסטוריית מחיר', 'he', 'Baseus', 'Baseus Store', 'tech', 'טכנולוגיה וטעינה',
  'https://ae01.alicdn.com/kf/dealpilot-fixture-history.jpg', '["https://ae01.alicdn.com/kf/dealpilot-fixture-history.jpg"]',
  'https://www.aliexpress.com/item/1005000000888.html', 'https://s.click.aliexpress.com/e/TEST_HISTORY_888', 600, 'published',
  now() - interval '6 days', now() - interval '6 days', now() - interval '1 hour',
  48.90, 'ILS', 'target_sale_price', 'search', 'sku-a', now() - interval '1 hour', null);
insert into dp_price_snapshots (product_id, observed_at, method, sku_id, price_field, price, currency) values
  ('1005000000888', now() - interval '5 days', 'search', 'sku-a', 'target_sale_price', 52.40, 'ILS'),
  ('1005000000888', now() - interval '3 days', 'detail', 'sku-a', 'target_sale_price', 45.10, 'ILS'),
  ('1005000000888', now() - interval '2 days', 'detail', 'sku-a', 'sale_price', 12.30, 'USD'),
  ('1005000000888', now() - interval '2 days', 'detail', 'sku-b', 'target_sale_price', 99.00, 'ILS'),
  ('1005000000888', now() - interval '1 hour', 'detail', 'sku-a', 'target_sale_price', 48.90, 'ILS')`);

const previous = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(HOST + "/")) return previous(input, init);
  const m = /^\/rest\/v1\/rpc\/(dp_[a-z_]+)$/.exec(new URL(url).pathname);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (!m || (init?.method ?? "GET") !== "POST" || headers.get("apikey") !== "fixture-only-never-real")
    return Response.json({ code: "PGRST000", message: "fixture: unexpected request" }, { status: 400 });
  const body = JSON.parse(String(init?.body ?? "{}"));
  try {
    const r = await db.query(`select public.${m[1]}($1::jsonb) as r`, [JSON.stringify(body.p ?? {})]);
    return Response.json(r.rows[0].r);
  } catch (e) {
    return Response.json({ code: "P0001", message: String(e.message).slice(0, 200) }, { status: 400 });
  }
};
