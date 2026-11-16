// Persistent catalog store: the production migration SQL runs in pglite and the
// pipeline is fed raw provider-shaped payloads through the real normalizer.
// TEST FIXTURE data only — this proves the pipeline and SQL, not the live API.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { runDiscovery, runPriceRefresh, PIPELINE_POLICY } from "../lib/catalog-store/pipeline.ts";
import { normalizeProductResponse, parseProductPage, PRODUCT_DETAIL_ROOT } from "../lib/aliexpress/normalize.ts";
import { displayPrice, priceDiagnostics, compareObservations, priceStatus } from "../lib/catalog-store/price-view.ts";
import { AffiliateError } from "../lib/aliexpress/query.ts";

const MIGRATION = new URL("../supabase/migrations/20261116000000_dealpilot_catalog_store.sql", import.meta.url);

async function freshDb() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(await readFile(MIGRATION, "utf8"));
  const rpc = async (fn, args) => {
    assert.match(fn, /^dp_[a-z_]+$/);
    const r = await db.query(`select public.${fn}($1::jsonb) as r`, [JSON.stringify(args ?? {})]);
    return r.rows[0].r;
  };
  return { db, rpc };
}

const categories = [
  { slug: "tech", label: "טכנולוגיה", terms: ["Baseus", "UGREEN"] },
  { slug: "home", label: "בית", terms: ["Dreame"] },
];
const BRAND = { Baseus: "Baseus", UGREEN: "UGREEN", Dreame: "Dreame" };

/** TEST FIXTURE raw row in the provider's documented field names. */
function row(id, term, { volume = 9000, price = "45.90", hebrew = true, link = true } = {}) {
  const brand = BRAND[term];
  return {
    product_id: id,
    product_title: hebrew ? `${brand} מטען מהיר TEST FIXTURE ${id}` : `${brand} fast charger TEST FIXTURE ${id}`,
    shop_name: `${brand} Official Store`,
    product_main_image_url: `https://ae01.alicdn.com/kf/fixture-${id}.jpg`,
    product_small_image_urls: { string: [`https://ae01.alicdn.com/kf/fixture-${id}-2.jpg`] },
    product_detail_url: `https://www.aliexpress.com/item/${id}.html`,
    promotion_link: link ? `https://s.click.aliexpress.com/e/_fixture${id}` : undefined,
    lastest_volume: volume,
    evaluate_rate: "97.5%",
    sku_id: "12000" + id.slice(-4),
    sale_price: "12.40", sale_price_currency: "USD",
    target_sale_price: price, target_sale_price_currency: "ILS",
    app_sale_price: "11.10", app_sale_price_currency: "USD",
    target_app_sale_price: "41.00", target_app_sale_price_currency: "ILS",
    original_price: "20.00", original_price_currency: "USD",
    target_original_price: "74.00", target_original_price_currency: "ILS",
    discount: "38%",
  };
}
const wrap = (root, rows, extra = {}) => ({ [root]: { resp_result: { resp_code: 200, resp_msg: "ok", result: { ...extra, products: { product: rows } } } } });

/** A provider with `perTerm` products per term, served in pages. */
function fakeProvider({ perTerm = 120, failTerms = new Set(), quotaAfter = Infinity } = {}) {
  const calls = [];
  const fetchPage = async (term, pageNo, pageSize) => {
    calls.push({ term, pageNo, pageSize });
    if (calls.length > quotaAfter) throw new AffiliateError("PROVIDER_ERROR_ApiCallLimit");
    if (failTerms.has(term)) throw new AffiliateError("PROVIDER_UNREACHABLE", 503);
    const base = { Baseus: 1005100000000, UGREEN: 1005200000000, Dreame: 1005300000000 }[term];
    const rows = [];
    for (let i = (pageNo - 1) * pageSize; i < Math.min(perTerm, pageNo * pageSize); i++) {
      const id = String(base + i);
      // Every 5th product is weak (low sales) and must be rejected; every 7th has no affiliate link.
      rows.push(row(id, term, { volume: i % 5 === 4 ? 300 : 9000 + i, link: i % 7 !== 6 }));
    }
    // The same product shows up under two terms: dedupe must hold.
    if (term === "UGREEN" && pageNo === 1) rows.push(row(String(1005100000000), "Baseus"));
    const payload = wrap("aliexpress_affiliate_product_query_response", rows, { current_record_count: rows.length, total_record_count: perTerm });
    return parseProductPage(payload, pageNo, pageSize);
  };
  return { fetchPage, calls };
}

test("normalizer keeps every raw price field and labels the field used", () => {
  const [p] = normalizeProductResponse(wrap("aliexpress_affiliate_product_query_response", [row("1005100000001", "Baseus")]));
  assert.equal(p.price, "45.90");
  assert.equal(p.currency, "ILS");
  assert.equal(p.priceField, "target_sale_price");
  assert.equal(p.priceFields.targetAppSalePrice, "41.00");
  assert.equal(p.priceFields.salePrice, "12.40");
  assert.equal(p.priceFields.skuId, "120000001");
  // Detail responses use another root key but the same row shape.
  const [d] = normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, [row("1005100000001", "Baseus", { price: "47.10" })]), PRODUCT_DETAIL_ROOT);
  assert.equal(d.price, "47.10");
  // Only one of the ILS pair returned: never label the USD amount as ILS.
  const r = row("1005100000002", "Baseus");
  delete r.target_sale_price_currency;
  const [u] = normalizeProductResponse(wrap("aliexpress_affiliate_product_query_response", [r]));
  assert.equal(u.currency, "USD");
  assert.equal(u.priceField, "sale_price");
});

test("discovery persists valid products, rejects weak ones, and a rerun creates no duplicates", async () => {
  const { db, rpc } = await freshDb();
  const provider = fakeProvider({ perTerm: 120 });
  const first = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(first.status, "succeeded");
  assert.equal(first.stats.pageSize, 50);
  assert.equal(first.stats.duplicatesInRun, 1, "cross-term duplicate counted once");
  const count = async (where = "true") => Number((await db.query(`select count(*)::int n from dp_products where ${where}`)).rows[0].n);
  assert.equal(await count(), 150, "3 pages x 50 unique ids stored");
  assert.equal(await count("status='published'"), first.stats.publishedNew);
  assert.ok(first.stats.publishedNew > 90 && first.stats.publishedNew < 150);
  // Every published row is complete; every rejected row says why.
  assert.equal(await count("status='published' and (affiliate_url is null or image is null or orders <= 5000)"), 0);
  assert.equal(await count("status='rejected' and cardinality(reject_reasons)=0"), 0);
  assert.ok(first.stats.rejected.sales > 0 && first.stats.rejected.affiliate > 0);

  // Second run: cursors moved to page 2, so new ids arrive and nothing is inserted twice.
  const second = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.deepEqual(provider.calls.slice(3).map((c) => c.pageNo), [2, 2, 2]);
  assert.equal(await count(), 300);
  const dupes = (await db.query("select product_id from dp_products group by source, product_id having count(*) > 1")).rows;
  assert.equal(dupes.length, 0);
  assert.ok(second.stats.publishedNew > 0);

  // A run that re-reads the same products (cursor reset) updates, never inserts.
  await db.exec("update dp_term_cursors set next_page = 1, exhausted_at = null");
  const before = await count();
  const third = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(third.stats.inserted, 0);
  assert.equal(third.stats.publishedNew, 0, "already-published products are not counted as new");
  assert.equal(await count(), before);
  // Unchanged quotes inside 20h are not appended to history again.
  assert.equal(third.stats.snapshots, 0);

  const dash = await rpc("dp_dashboard", {});
  assert.equal(dash.totals.all, 300);
  assert.equal(dash.totals.published_today, first.stats.publishedNew + second.stats.publishedNew);
  assert.equal(dash.runs.length, 3);
  assert.ok(dash.events.some((e) => e.code === "BELOW_DAILY_TARGET") || first.stats.publishedNew >= PIPELINE_POLICY.dailyNewTarget);
});

test("a term exhausts at its last short page and restarts later", async () => {
  const { db, rpc } = await freshDb();
  const provider = fakeProvider({ perTerm: 60 });
  await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  const r2 = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(r2.stats.termsExhausted, 3);
  const r3 = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(r3.stats.calls, 0, "exhausted terms are not searched again immediately");
  await db.exec("update dp_term_cursors set exhausted_at = now() - interval '8 days'");
  const r4 = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(r4.stats.calls, 3);
  assert.deepEqual(provider.calls.slice(-3).map((c) => c.pageNo), [1, 1, 1]);
});

test("provider failures are logged, keep the cursor, and are retried next run", async () => {
  const { db, rpc } = await freshDb();
  const failing = fakeProvider({ failTerms: new Set(["UGREEN"]) });
  const r = await runDiscovery({ rpc, categories, fetchPage: failing.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(r.status, "partial");
  assert.equal(r.errorCodes.PROVIDER_UNREACHABLE, 1);
  const ev = (await db.query("select code, term from dp_import_events where level='error'")).rows;
  assert.deepEqual(ev, [{ code: "PROVIDER_UNREACHABLE", term: "UGREEN" }]);
  const cur = (await db.query("select next_page from dp_term_cursors where term='UGREEN'")).rows[0];
  assert.equal(cur.next_page, 1, "failed page will be retried");
  const ok = fakeProvider();
  await runDiscovery({ rpc, categories, fetchPage: ok.fetchPage, trigger: "test", maxCalls: 1 });
  assert.equal(ok.calls[0].term, "UGREEN", "the least recently successful term goes first");

  // Quota: stops immediately, run is partial, remaining terms wait.
  const { rpc: rpc2 } = await freshDb();
  const q = fakeProvider({ quotaAfter: 1 });
  const rq = await runDiscovery({ rpc: rpc2, categories, fetchPage: q.fetchPage, trigger: "test", maxCalls: 3, concurrency: 1 });
  assert.equal(rq.stats.quotaStopped, true);
  assert.equal(q.calls.length, 2);

  // Everything fails: run is marked failed, not succeeded.
  const { rpc: rpc3, db: db3 } = await freshDb();
  const down = fakeProvider({ failTerms: new Set(["Baseus", "UGREEN", "Dreame"]) });
  const rf = await runDiscovery({ rpc: rpc3, categories, fetchPage: down.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal(rf.status, "failed");
  assert.equal((await db3.query("select status from dp_import_runs")).rows[0].status, "failed");
});

test("page size falls back once when the provider rejects it", async () => {
  const { rpc } = await freshDb();
  const base = fakeProvider();
  const fetchPage = async (term, pageNo, size) => {
    if (size === 50) throw new AffiliateError("PROVIDER_RESULT_400_INVALID_PARAMETER");
    return base.fetchPage(term, pageNo, size);
  };
  const r = await runDiscovery({ rpc, categories, fetchPage, trigger: "test", maxCalls: 4 });
  assert.equal(r.stats.pageSize, 20);
  assert.equal(r.status, "succeeded");
});

test("a crashed run is recorded as failed and an abandoned run is closed", async () => {
  const { db, rpc } = await freshDb();
  const broken = async (fn, args) => {
    if (fn === "dp_ingest") throw new Error("DB_WRITE_FAILED");
    return rpc(fn, args);
  };
  await assert.rejects(runDiscovery({ rpc: broken, categories, fetchPage: fakeProvider().fetchPage, trigger: "test", maxCalls: 1 }), /DB_WRITE_FAILED/);
  const run = (await db.query("select status, error_codes from dp_import_runs")).rows[0];
  assert.equal(run.status, "failed");
  assert.equal(run.error_codes.DB_WRITE_FAILED, 1);
  await db.query("insert into dp_import_runs (kind, trigger, started_at) values ('discover','cron', now() - interval '2 hours')");
  await rpc("dp_start_run", { kind: "discover", trigger: "test" });
  const abandoned = (await db.query("select status from dp_import_runs where started_at < now() - interval '1 hour'")).rows[0];
  assert.equal(abandoned.status, "failed");
});

test("price refresh records detail quotes, keeps history and unpublishes products that vanish", async () => {
  const { db, rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 10 }).fetchPage, trigger: "test", maxCalls: 3 });
  const published = (await db.query("select product_id from dp_products where status='published' order by product_id")).rows.map((r) => r.product_id);
  const gone = published[0];
  const detailCalls = [];
  const fetchDetails = async (ids) => {
    detailCalls.push(ids);
    const rows = ids.filter((id) => id !== gone).map((id) => row(id, id.startsWith("10052") ? "UGREEN" : id.startsWith("10053") ? "Dreame" : "Baseus", { price: "49.90" }));
    const products = normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, rows), PRODUCT_DETAIL_ROOT);
    return { products, missing: [] };
  };
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  assert.equal(r.status, "succeeded");
  assert.ok(detailCalls.every((b) => b.length <= 20));
  assert.equal(r.stats.updated, published.length - 1);
  assert.equal(r.stats.missing, 1);
  const p = (await db.query("select price::text, price_method, price_field from dp_products where product_id=$1", [published[1]])).rows[0];
  assert.deepEqual(p, { price: "49.90", price_method: "detail", price_field: "target_sale_price" });
  const hist = await rpc("dp_price_history", { product_id: published[1] });
  assert.deepEqual(hist.map((h) => [h.method, Number(h.price)]), [["search", 45.9], ["detail", 49.9]]);
  // The dashboard exposes the search-vs-detail gap with raw fields.
  const dash = await rpc("dp_dashboard", {});
  const gap = dash.price_gaps.find((g) => g.product_id === published[1]);
  assert.equal(Number(gap.gap_pct), 8.7);
  assert.equal(gap.detail_fields.targetAppSalePrice, "41.00");
  // Missing three times in a row: automatically unpublished and logged.
  await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  const g = (await db.query("select status, reject_reasons from dp_products where product_id=$1", [gone])).rows[0];
  assert.equal(g.status, "unpublished");
  assert.deepEqual(g.reject_reasons, ["detail_missing"]);
  assert.equal((await db.query("select count(*)::int n from dp_import_events where code='AUTO_UNPUBLISHED_DETAIL_MISSING'")).rows[0].n, 1);
  // Not due again within min age.
  const r4 = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 5 });
  assert.equal(r4.stats.calls, 0);
});

test("discovery spends its budget going deeper and stops a term at the first page with no qualifying sales", async () => {
  const { db, rpc } = await freshDb();
  const provider = fakeProvider({ perTerm: 400 });
  const r = await runDiscovery({ rpc, categories, fetchPage: provider.fetchPage, trigger: "test", maxCalls: 7, concurrency: 3 });
  assert.equal(r.stats.calls, 7, "budget spent across pages 1, 2 and 3");
  assert.deepEqual([...new Set(provider.calls.map((c) => c.pageNo))].sort(), [1, 2, 3]);
  // A full page sorted by sales whose rows are all at/below the threshold ends the term.
  const { rpc: rpc2, db: db2 } = await freshDb();
  const weak = async (term, pageNo, size) => {
    const page = await provider.fetchPage(term, pageNo, size);
    if (pageNo === 2) page.products.forEach((p) => (p.orders = 4000));
    return page;
  };
  await runDiscovery({ rpc: rpc2, categories, fetchPage: weak, trigger: "test", maxCalls: 6 });
  const cursors = (await db2.query("select next_page, exhausted_at is not null as exhausted from dp_term_cursors")).rows;
  assert.ok(cursors.every((c) => c.exhausted && c.next_page === 1));
  void db;
});

test("a detail batch with most ids missing is logged and does not count misses", async () => {
  const { db, rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 10 }).fetchPage, trigger: "test", maxCalls: 3 });
  const empty = async () => ({ products: [], missing: [] });
  for (let i = 0; i < 3; i++) await runPriceRefresh({ rpc, fetchDetails: empty, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  assert.equal((await db.query("select count(*)::int n from dp_products where status='unpublished'")).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int n from dp_products where price_missing_count > 0")).rows[0].n, 0);
  assert.ok((await db.query("select count(*)::int n from dp_import_events where code='DETAIL_BATCH_MOSTLY_MISSING'")).rows[0].n >= 3);
});

test("the cached catalog list carries at most 4 images per product", async () => {
  const { db, rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 10 }).fetchPage, trigger: "test", maxCalls: 3 });
  await db.exec(`update dp_products set images = '["https://ae01.alicdn.com/1.jpg","https://ae01.alicdn.com/2.jpg","https://ae01.alicdn.com/3.jpg","https://ae01.alicdn.com/4.jpg","https://ae01.alicdn.com/5.jpg","https://ae01.alicdn.com/6.jpg"]'`);
  const list = await rpc("dp_catalog", {});
  assert.ok(list.length > 0 && list.every((p) => p.images.length === 4));
});

test("a manual unpublish survives later imports; republish restores it", async () => {
  const { db, rpc } = await freshDb();
  const prov = fakeProvider({ perTerm: 10 });
  await runDiscovery({ rpc, categories, fetchPage: prov.fetchPage, trigger: "test", maxCalls: 3 });
  const id = (await db.query("select product_id from dp_products where status='published' limit 1")).rows[0].product_id;
  await rpc("dp_set_unpublished", { product_id: id, unpublished: true });
  await db.exec("update dp_term_cursors set next_page = 1, exhausted_at = null");
  await runDiscovery({ rpc, categories, fetchPage: prov.fetchPage, trigger: "test", maxCalls: 3 });
  assert.equal((await db.query("select status from dp_products where product_id=$1", [id])).rows[0].status, "unpublished");
  const catalog = await rpc("dp_catalog", {});
  assert.ok(!catalog.some((p) => p.product_id === id));
  await rpc("dp_set_unpublished", { product_id: id, unpublished: false });
  assert.equal((await db.query("select status from dp_products where product_id=$1", [id])).rows[0].status, "published");
});

test("anon and authenticated roles cannot read or call the store", async () => {
  const { db } = await freshDb();
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select * from public.dp_products"), /permission denied/);
    await assert.rejects(db.query("select public.dp_catalog('{}'::jsonb)"), /permission denied/);
    await assert.rejects(db.query("select public.dp_record_click('{}'::jsonb)"), /permission denied/);
    await db.exec("reset role");
  }
});

test("database rejects incomplete published rows and bad ids", async () => {
  const { rpc } = await freshDb();
  const base = { product_id: "1005999999999", title: "x", title_language: "he", category_slug: "tech", category_label: "t", status: "published", reject_reasons: [], images: [] };
  await assert.rejects(rpc("dp_ingest", { items: [{ ...base, image: null, product_url: "https://www.aliexpress.com/item/1.html", affiliate_url: "https://s.click.aliexpress.com/e/x" }] }), /dp_products_published_complete/);
  await assert.rejects(rpc("dp_ingest", { items: [{ ...base, product_id: "abc", status: "rejected" }] }), /check constraint/);
  // A malformed price is ignored, never stored.
  const res = await rpc("dp_ingest", { items: [{ ...base, status: "rejected", price: "12,50", currency: "ILS" }] });
  assert.equal(res.snapshots, 0);
});

test("display policy withholds stale or unknown prices", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  assert.deepEqual(displayPrice({ price: "45.90", currency: "ILS", price_observed_at: "2026-11-16T00:00:00Z" }, now).price, "45.90");
  const stale = displayPrice({ price: "45.90", currency: "ILS", price_observed_at: "2026-11-13T00:00:00Z" }, now);
  assert.equal(stale.price, null);
  assert.equal(stale.status, "stale");
  assert.equal(displayPrice({ price: null, currency: null, price_observed_at: null }, now).status, "unknown");
  assert.equal(displayPrice({ price: "0", currency: "ILS", price_observed_at: "2026-11-16T00:00:00Z" }, now).price, null);
  assert.equal(priceStatus("2026-11-14T12:00:00Z", now), "current", "exactly 48h is still current");
});

test("price diagnostics explain likely checkout gaps from returned fields only", () => {
  const [p] = normalizeProductResponse(wrap("aliexpress_affiliate_product_query_response", [row("1005100000001", "Baseus")]));
  // 45.90 / 12.40 = 3.70 implied vs 3.70 BOI → no FX flag; app price differs; discount present.
  assert.deepEqual(priceDiagnostics(p.priceFields, 3.7).sort(), ["app_price_differs", "provider_discount"]);
  assert.ok(priceDiagnostics(p.priceFields, 3.2).includes("implied_fx_off"));
  assert.deepEqual(priceDiagnostics({}), []);
  assert.deepEqual(compareObservations({ sku_id: "1", currency: "ILS" }, { sku_id: "2", currency: "USD" }), ["sku_changed", "currency_changed"]);
});
