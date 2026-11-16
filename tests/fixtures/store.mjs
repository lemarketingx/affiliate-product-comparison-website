// Explicit Node preload for the isolated catalog-store e2e server (port 3105) only.
// It answers the Supabase PostgREST RPC endpoint (`POST /rest/v1/rpc/<fn>`) from an
// in-process pglite database loaded with the REAL migration, so the server code
// (supabase-js client, { p } argument contract, jobs, reads) runs unmodified.
// Never imported by application code. TEST FIXTURE data only.
import { readFileSync } from "node:fs";
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
await db.exec(readFileSync(new URL("../../supabase/migrations/20261116000000_dealpilot_catalog_store.sql", import.meta.url), "utf8"));
// One published product whose last price is 5 days old: it must never be shown as current.
await db.exec(`insert into dp_products (product_id, title, title_language, brand, shop_name, category_slug, category_label,
  image, images, product_url, affiliate_url, orders, status, first_seen_at, first_published_at, last_seen_at,
  price, currency, price_field, price_method, price_observed_at, price_check_at)
  values ('1005000000777', 'TEST FIXTURE — Baseus מטען ישן עם מחיר לא עדכני', 'he', 'Baseus', 'Baseus Store', 'tech', 'טכנולוגיה וטעינה',
  'https://ae01.alicdn.com/kf/dealpilot-fixture-stale.jpg', '["https://ae01.alicdn.com/kf/dealpilot-fixture-stale.jpg"]',
  'https://www.aliexpress.com/item/1005000000777.html', 'https://s.click.aliexpress.com/e/TEST_STALE_777', 90000, 'published',
  now() - interval '6 days', now() - interval '6 days', now() - interval '5 days',
  77.70, 'ILS', 'target_sale_price', 'search', now() - interval '5 days', null)`);

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
