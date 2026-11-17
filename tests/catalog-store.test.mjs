// Persistent catalog store: the production migration SQL runs in pglite and the
// pipeline is fed raw provider-shaped payloads through the real normalizer.
// TEST FIXTURE data only — this proves the pipeline and SQL, not the live API.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { runDiscovery, runPriceRefresh, PIPELINE_POLICY } from "../lib/catalog-store/pipeline.ts";
import { normalizeProductResponse, parseProductPage, PRODUCT_DETAIL_ROOT } from "../lib/aliexpress/normalize.ts";
import { displayPrice, priceDiagnostics, compareObservations, priceStatus } from "../lib/catalog-store/price-view.ts";
import { AffiliateError } from "../lib/aliexpress/query.ts";

const MIGRATION = new URL("../supabase/migrations/20261116000000_dealpilot_catalog_store.sql", import.meta.url);

async function freshDb() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  // Every migration, in order — the same state the real project has.
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(f, dir), "utf8"));
  void MIGRATION;
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
  assert.equal(await count("status='published' and (affiliate_url is null or image is null or orders < 500)"), 0);
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
    if (pageNo === 2) page.products.forEach((p) => (p.orders = 400));
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
  // Owner report 2026-11-17 (site price ≠ AliExpress): the limit is 30 h, not 48 h.
  assert.equal(priceStatus("2026-11-15T06:00:00Z", now), "current", "exactly 30h is still current");
  assert.equal(priceStatus("2026-11-15T05:00:00Z", now), "stale", "31h is stale");
  assert.equal(priceStatus("2026-11-14T12:00:00Z", now), "stale", "48h is no longer shown as current");
});

test("price age in hours for the 'may have changed' warning", async () => {
  const { priceAgeHours, PRICE_WARN_AGE_HOURS } = await import("../lib/catalog-store/price-view.ts");
  const now = new Date("2026-11-16T12:00:00Z");
  assert.equal(priceAgeHours("2026-11-16T00:00:00Z", now), 12);
  assert.equal(priceAgeHours(null, now), null);
  assert.equal(PRICE_WARN_AGE_HOURS, 12);
});

test("price diagnostics explain likely checkout gaps from returned fields only", () => {
  const [p] = normalizeProductResponse(wrap("aliexpress_affiliate_product_query_response", [row("1005100000001", "Baseus")]));
  // 45.90 / 12.40 = 3.70 implied vs 3.70 BOI → no FX flag; app price differs; discount present.
  assert.deepEqual(priceDiagnostics(p.priceFields, 3.7).sort(), ["app_price_differs", "provider_discount"]);
  assert.ok(priceDiagnostics(p.priceFields, 3.2).includes("implied_fx_off"));
  assert.deepEqual(priceDiagnostics({}), []);
  assert.deepEqual(compareObservations({ sku_id: "1", currency: "ILS" }, { sku_id: "2", currency: "USD" }), ["sku_changed", "currency_changed"]);
});

// ---- 2026-11-16: productdetail.get 402 INVALID_PARAMETER handling ----
import { DETAIL_PROFILES, detailParams, fetchDetailsAdaptive, newProfileState } from "../lib/aliexpress/detail-profiles.ts";
const CURRENCY_MIGRATION = new URL("../supabase/migrations/20261116130000_detail_price_currency.sql", import.meta.url);
async function dbWithCurrencyFix() {
  void CURRENCY_MIGRATION; // already applied by freshDb (all migrations in order)
  return freshDb();
}
const invalid402 = () => Object.assign(new AffiliateError("PROVIDER_RESULT_402_INVALID_PARAMETER", 502, "Invalid parameter target_language"), {});

test("provider 402 keeps a sanitised message for the admin log", () => {
  const payload = { aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 402, resp_msg: "The input parameter target_currency is invalid https://x.aliexpress.com/secret?a=b" } } };
  try {
    normalizeProductResponse(payload, PRODUCT_DETAIL_ROOT);
    assert.fail("should throw");
  } catch (e) {
    assert.equal(e.code, "PROVIDER_RESULT_402_INVALID_PARAMETER");
    assert.match(e.detail, /target_currency is invalid/);
    assert.doesNotMatch(e.detail, /aliexpress\.com|secret/);
  }
});

test("detail profiles step down one parameter at a time to the live-probed request", async () => {
  assert.deepEqual(detailParams(DETAIL_PROFILES[0], ["1", "2"], "trk"), { product_ids: "1,2", country: "IL", target_currency: "ILS", target_language: "HE" }, "first: ILS, no tracking_id");
  assert.deepEqual(detailParams(DETAIL_PROFILES.find((p) => p.name === "full"), ["1"], "trk"), { product_ids: "1", country: "IL", target_currency: "USD", target_language: "HE", tracking_id: "trk" });
  assert.deepEqual(detailParams(DETAIL_PROFILES.at(-1), ["1"], "trk"), { product_ids: "1", country: "IL" }, "last profile = 2026-11-14 probe shape");
  const ids = ["1005100000001", "1005100000002", "1005100000003"];
  const seen = [];
  const state = newProfileState();
  // Fake provider that rejects target_language (TEST FIXTURE).
  const call = async (params, chunk, profile) => {
    const p = params(profile, chunk);
    seen.push(Object.keys(p).sort().join(","));
    if (p.target_language) throw invalid402();
    return { products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, chunk.map((id) => row(id, "Baseus"))), PRODUCT_DETAIL_ROOT) };
  };
  const r = await fetchDetailsAdaptive(ids, state, call, 6, "trk");
  assert.equal(r.profile, "no_language");
  assert.equal(r.calls, 4);
  assert.equal(r.products.length, 3);
  const bad = "PROVIDER_RESULT_402_INVALID_PARAMETER";
  assert.deepEqual(state.attempts.map((a) => [a.profile, a.code]), [["ils_no_tracking", bad], ["usd_no_tracking", bad], ["full", bad], ["no_language", null]]);
  // The learned profile is reused: no second failing call.
  const r2 = await fetchDetailsAdaptive(ids, state, call, 5, "trk");
  assert.equal(r2.calls, 1);
  // Only single-id requests accepted: one id fetched, the rest deferred (not missing).
  const s2 = newProfileState();
  const single = async (params, chunk, profile) => {
    if (chunk.length > 1 || params(profile, chunk).target_currency || params(profile, chunk).tracking_id) throw invalid402();
    return { products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, chunk.map((id) => row(id, "Baseus"))), PRODUCT_DETAIL_ROOT) };
  };
  const r3 = await fetchDetailsAdaptive(ids, s2, single, 10, "trk");
  assert.equal(r3.profile, "probe_single");
  assert.deepEqual(r3.deferred, ids.slice(1));
  assert.deepEqual(r3.missing, []);
  // Non-parameter errors are not "fixed" by dropping parameters.
  await assert.rejects(fetchDetailsAdaptive(ids, newProfileState(), async () => { throw new AffiliateError("PROVIDER_ERROR_ApiCallLimit"); }, 5, null), /ApiCallLimit/);
  // Budget: never more calls than allowed.
  const s4 = newProfileState();
  await assert.rejects(fetchDetailsAdaptive(ids, s4, async () => { throw invalid402(); }, 2, null), /INVALID_PARAMETER/);
  assert.equal(s4.attempts.length, 2);
});

test("price refresh logs provider message and profile, and drains deferred ids within budget", async () => {
  const { db, rpc } = await dbWithCurrencyFix();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 4 }).fetchPage, trigger: "test", maxCalls: 3 });
  const published = (await db.query("select count(*)::int n from dp_products where status='published'")).rows[0].n;
  assert.ok(published >= 3);
  const state = newProfileState();
  let calls = 0;
  const fetchDetails = (ids, left) => fetchDetailsAdaptive(ids, state, async (params, chunk, profile) => {
    calls++;
    if (chunk.length > 1) throw invalid402();
    void params(profile, chunk);
    return { products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, chunk.map((id) => row(id, "Baseus", { price: "45.90" }))), PRODUCT_DETAIL_ROOT) };
  }, left, null);
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 40, minAgeHours: 0 });
  assert.equal(r.stats.profile, "probe_single");
  assert.equal(r.stats.checked, published);
  assert.equal(r.stats.calls, calls);
  assert.ok(r.stats.calls <= 40);
  assert.equal(r.stats.failedBatches, 0);
  const ev = (await db.query("select code, detail from dp_import_events where code='DETAIL_PROFILE_ACCEPTED'")).rows;
  assert.deepEqual(ev, [{ code: "DETAIL_PROFILE_ACCEPTED", detail: "probe_single" }]);
  // A batch that fails outright logs the sanitised provider message.
  const { db: db2, rpc: rpc2 } = await dbWithCurrencyFix();
  await runDiscovery({ rpc: rpc2, categories, fetchPage: fakeProvider({ perTerm: 4 }).fetchPage, trigger: "test", maxCalls: 3 });
  const failing = (ids, left) => fetchDetailsAdaptive(ids, newProfileState(), async () => { throw invalid402(); }, left, null);
  const rf = await runPriceRefresh({ rpc: rpc2, fetchDetails: failing, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  assert.equal(rf.status, "failed");
  assert.equal(rf.stats.calls, 5, "every fallback attempt counts against the budget");
  const msg = (await db2.query("select detail from dp_import_events where level='error'")).rows[0].detail;
  assert.match(msg, /provider: Invalid parameter target_language/);
});

test("a USD detail quote confirms an unchanged ILS price, replaces a changed one, and never relabels currency", async () => {
  const { db, rpc } = await dbWithCurrencyFix();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 3 }).fetchPage, trigger: "test", maxCalls: 3 });
  const ids = (await db.query("select product_id from dp_products where status='published' order by product_id limit 3")).rows.map((r) => r.product_id);
  // Detail answers in USD only (no target_* fields): sale_price 12.40 = unchanged, 13.10 = changed.
  const usdRow = (id, usd) => { const r = row(id, "Baseus"); for (const k of Object.keys(r)) if (k.startsWith("target_") || k.startsWith("app_")) delete r[k]; r.sale_price = usd; return r; };
  const answer = { [ids[0]]: "12.40", [ids[1]]: "13.10", [ids[2]]: "12.40" };
  await db.query("update dp_price_snapshots set sku_id = '999' where product_id = $1", [ids[2]]); // different SKU than detail
  const fetchDetails = async (asked) => ({
    products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, asked.filter((id) => answer[id]).map((id) => usdRow(id, answer[id]))), PRODUCT_DETAIL_ROOT),
    missing: [],
  });
  const before = (await db.query("select price_observed_at from dp_products where product_id=$1", [ids[0]])).rows[0].price_observed_at;
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 1, minAgeHours: 0 });
  assert.equal(r.stats.confirmed, 1);
  assert.equal(r.stats.updated, 2);
  const get = async (id) => (await db.query("select price::text, currency, price_method, price_observed_at from dp_products where product_id=$1", [id])).rows[0];
  const a = await get(ids[0]);
  assert.deepEqual([a.price, a.currency, a.price_method], ["45.90", "ILS", "confirmed"], "ILS quote kept and confirmed");
  assert.ok(a.price_observed_at > before);
  const b = await get(ids[1]);
  assert.deepEqual([b.price, b.currency, b.price_method], ["13.10", "USD", "detail"], "changed price shown in its own currency");
  const c = await get(ids[2]);
  assert.deepEqual([c.price, c.currency], ["12.40", "USD"], "SKU mismatch is not a confirmation");
  // History keeps every detail quote; the gap view compares like with like (USD vs USD).
  const dash = await rpc("dp_dashboard", {});
  assert.equal(dash.totals.published_detail_checked >= 3, true);
  const gap = dash.price_gaps.find((g) => g.product_id === ids[1]);
  assert.equal(Number(gap.gap_pct), 5.6);
  assert.ok(!dash.price_gaps.some((g) => g.product_id === ids[0]), "unchanged price is not a gap");
});

// ---- 2026-11-16: provider frequency limit, separate jobs, one job at a time ----
import { banSeconds, createPacer, withBanRetry } from "../lib/aliexpress/pacer.ts";
const LIVE_BAN = "Api access frequency exceeds the limit. this ban will last 1 seconds"; // verbatim, run #6
const banErr = () => new AffiliateError("PROVIDER_ERROR_ApiCallLimit", 502, LIVE_BAN);

test("ban parsing uses the provider's own words and ignores long or unrelated limits", () => {
  assert.equal(banSeconds(banErr()), 1);
  assert.equal(banSeconds(new AffiliateError("PROVIDER_ERROR_ApiCallLimit", 502, "this ban will last 3600 seconds")), null, "daily-quota style ban is not waited out");
  assert.equal(banSeconds(new AffiliateError("PROVIDER_ERROR_ApiCallLimit")), null, "no message, no guess");
  assert.equal(banSeconds(new AffiliateError("PROVIDER_RESULT_402_INVALID_PARAMETER", 502, "ban will last 1 seconds")), null);
});

test("pacer spaces calls in this process and never drops one", async () => {
  let clock = 0;
  const starts = [];
  const sleep = async (ms) => { clock += ms; };
  const pace = createPacer(1100, () => clock, sleep);
  await Promise.all([1, 2, 3].map((i) => pace(async () => { starts.push(clock); return i; })));
  assert.deepEqual(starts, [0, 1100, 2200]);
  await assert.rejects(pace(async () => { throw new Error("X"); }), /X/);
  assert.equal(await pace(async () => "after-error"), "after-error", "a failed call does not break the queue");
});

test("a 1-second ban is waited out once and counted as a second call", async () => {
  const waits = [];
  let n = 0;
  const r = await withBanRetry(async () => { if (n++ === 0) throw banErr(); return "ok"; }, () => true, async (ms) => { waits.push(ms); });
  assert.deepEqual([r.value, r.calls, waits], ["ok", 2, [1250]]);
  // No budget left: no retry, error carries calls=1.
  await assert.rejects(withBanRetry(async () => { throw banErr(); }, () => false, async () => {}), (e) => e.calls === 1);
  // Banned again after waiting: stop, calls=2.
  await assert.rejects(withBanRetry(async () => { throw banErr(); }, () => true, async () => {}), (e) => e.calls === 2);
});

test("price refresh rides through a frequency ban instead of stopping (run #6 scenario)", async () => {
  const { rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 30 }).fetchPage, trigger: "test", maxCalls: 3 });
  // Run #6 already taught us these were rejected: start straight at country_only.
  const state = newProfileState(["ils_no_tracking", "usd_no_tracking", "full", "no_language", "no_currency"]);
  let calls = 0;
  const fetchDetails = (ids, left) => fetchDetailsAdaptive(ids, state, async (params, chunk, profile) => {
    calls++;
    if (calls === 2) throw banErr(); // second call, as live
    void params(profile, chunk);
    return { products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, chunk.map((id) => row(id, "Baseus"))), PRODUCT_DETAIL_ROOT) };
  }, left, null, async () => {});
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 10, minAgeHours: 0 });
  assert.equal(r.status, "succeeded");
  assert.equal(r.stats.quotaStopped, false);
  assert.equal(r.stats.calls, calls, "the retry is counted");
  assert.ok(r.stats.checked > 20, "the run continued past the ban");
  // Remembered profile: no 402 attempts were spent.
  assert.ok(state.attempts.every((a) => a.profile === "country_only"));
});

test("discovery rides through a frequency ban within budget", async () => {
  const { rpc } = await freshDb();
  const base = fakeProvider({ perTerm: 60 });
  let n = 0;
  const fetchPage = async (...a) => { if (n++ === 1) throw banErr(); return base.fetchPage(...a); };
  const r = await runDiscovery({ rpc, categories, fetchPage, trigger: "test", maxCalls: 6, concurrency: 1, sleep: async () => {} });
  assert.equal(r.status, "succeeded");
  assert.equal(r.stats.calls, 6);
  assert.equal(r.stats.pagesOk, 5, "6 calls = 5 pages + 1 banned attempt");
});

test("only one provider job runs at a time, even when two start together", async () => {
  const { db, rpc } = await freshDb();
  const first = await rpc("dp_start_run", { kind: "discover", trigger: "cron" });
  await assert.rejects(rpc("dp_start_run", { kind: "price_refresh", trigger: "manual" }), (e) => e.code === "DP409" && /RUN_IN_PROGRESS/.test(e.message));
  await rpc("dp_finish_run", { id: first.id, status: "succeeded", stats: {}, error_codes: {} });
  const second = await rpc("dp_start_run", { kind: "price_refresh", trigger: "manual" });
  assert.ok(second.id > first.id);
  // A run stuck for more than 10 minutes is closed as abandoned and no longer blocks.
  await db.query("update dp_import_runs set started_at = now() - interval '11 minutes' where id = $1", [second.id]);
  const third = await rpc("dp_start_run", { kind: "discover", trigger: "cron" });
  assert.ok(third.id);
  assert.equal((await db.query("select status from dp_import_runs where id = $1", [second.id])).rows[0].status, "failed");
  // The pipeline surfaces the refusal and makes no provider call.
  let called = false;
  await assert.rejects(
    runDiscovery({ rpc, categories, fetchPage: async () => { called = true; }, trigger: "test", maxCalls: 3 }),
    (e) => e.code === "DP409",
  );
  assert.equal(called, false);
});

test("dp_start_run takes the advisory lock before checking and inserting (static SQL check)", async () => {
  // pglite has a single connection, so a true two-session race cannot run here.
  // Atomicity comes from pg_advisory_xact_lock (held to transaction end, standard
  // Postgres semantics); this test pins the statement order that relies on it.
  const sql = await readFile(new URL("../supabase/migrations/20261116150000_run_lock.sql", import.meta.url), "utf8");
  const fn = sql.slice(sql.indexOf("create or replace function public.dp_start_run"), sql.indexOf("create or replace function public.dp_last_detail_profile"));
  assert.ok(fn.indexOf("pg_advisory_xact_lock") < fn.indexOf("select id into busy"), "lock is taken before the check");
  assert.ok(fn.indexOf("select id into busy") < fn.indexOf("insert into dp_import_runs"), "check happens before the insert");
});

test("the accepted detail profile is remembered for the next run", async () => {
  const { rpc } = await freshDb();
  assert.deepEqual(await rpc("dp_last_detail_profile", {}), { profile: null, rejected: [] });
  const { id } = await rpc("dp_start_run", { kind: "price_refresh", trigger: "test" });
  await rpc("dp_log_events", { run_id: id, events: [
    { level: "info", code: "DETAIL_PROFILE_REJECTED", detail: "ils_no_tracking" },
    { level: "info", code: "DETAIL_PROFILE_ACCEPTED", detail: "usd_no_tracking" },
  ] });
  await rpc("dp_finish_run", { id, status: "succeeded", stats: {}, error_codes: {} });
  const mem = await rpc("dp_last_detail_profile", {});
  assert.deepEqual(mem, { profile: "usd_no_tracking", rejected: ["ils_no_tracking"] });
  assert.equal(DETAIL_PROFILES[newProfileState(mem.rejected).index].name, "usd_no_tracking");
  assert.equal(newProfileState([]).index, 0);
  assert.equal(newProfileState(DETAIL_PROFILES.map((p) => p.name)).index, DETAIL_PROFILES.length - 1, "never runs out of profiles");
});

test("live scenario: only tracking_id is rejected -> ILS profile accepted, shekel prices stay shekel", async () => {
  const { db, rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 5 }).fetchPage, trigger: "test", maxCalls: 3 });
  const state = newProfileState([]);
  const fetchDetails = (ids, left) => fetchDetailsAdaptive(ids, state, async (params, chunk, profile) => {
    const p = params(profile, chunk);
    if (p.tracking_id) throw invalid402(); // what run #6 showed
    assert.equal(p.target_currency, "ILS");
    return { products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, chunk.map((id) => row(id, "Baseus", { price: "47.00" }))), PRODUCT_DETAIL_ROOT) };
  }, left, "trk", async () => {});
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 5, minAgeHours: 0 });
  assert.equal(r.stats.profile, "ils_no_tracking");
  assert.equal(r.stats.calls, 1, "accepted on the first call");
  const cur = (await db.query("select distinct currency, price_method from dp_products where status='published'")).rows;
  assert.deepEqual(cur, [{ currency: "ILS", price_method: "detail" }]);
});

// ---- 2026-11-16: affiliate link verification ----
import { checkAffiliateLink, productIdFromUrl } from "../lib/aliexpress/link-check.ts";
import { runLinkCheck } from "../lib/catalog-store/pipeline.ts";
const ID = "1005010579452804";
/** TEST FIXTURE redirect map: url -> response. */
const hops = (map) => async (url) => map[url] ?? { status: 404, location: null };

test("link check follows redirects to the same product without loading it", async () => {
  const fetcher = hops({
    "https://s.click.aliexpress.com/s/abc": { status: 302, location: "https://star.aliexpress.com/share/share.htm?redirectUrl=x&aff_fcid=1" },
    "https://star.aliexpress.com/share/share.htm?redirectUrl=x&aff_fcid=1": { status: 302, location: `https://he.aliexpress.com/item/${ID}.html?aff_fcid=1&aff_platform=api&sk=_x&terminal_id=t` },
  });
  const r = await checkAffiliateLink("https://s.click.aliexpress.com/s/abc", ID, fetcher);
  assert.equal(r.status, "ok");
  assert.equal(r.finalProductId, ID);
  assert.equal(r.hops, 2);
  assert.deepEqual(r.affParams, ["aff_fcid", "aff_platform", "sk", "terminal_id"]);
  // The product page itself was never requested.
  const seen = [];
  await checkAffiliateLink("https://s.click.aliexpress.com/s/abc", ID, async (u) => { seen.push(u); return fetcher(u); });
  assert.ok(!seen.some((u) => u.includes("/item/")));
});

test("link check: wrong product, off-site and broken are told apart; body mismatches are never conclusive", async () => {
  const other = await checkAffiliateLink("https://s.click.aliexpress.com/s/a", ID, hops({ "https://s.click.aliexpress.com/s/a": { status: 302, location: "https://he.aliexpress.com/item/1005000000001.html" } }));
  assert.equal(other.status, "wrong_product");
  const off = await checkAffiliateLink("https://s.click.aliexpress.com/s/a", ID, hops({ "https://s.click.aliexpress.com/s/a": { status: 302, location: "https://evil.example/item/1.html" } }));
  assert.equal(off.status, "not_aliexpress");
  assert.equal((await checkAffiliateLink("https://s.click.aliexpress.com/s/a", ID, hops({}))).status, "broken");
  assert.equal((await checkAffiliateLink("https://s.click.aliexpress.com/s/a", ID, async () => { throw new Error("timeout"); })).status, "broken");
  assert.equal((await checkAffiliateLink("http://s.click.aliexpress.com/s/a", ID, hops({}))).status, "not_aliexpress");
  // 200 page with a script redirect to our product, plus a recommendation for another.
  const page = `<a href="https://he.aliexpress.com/item/1005000000001.html">x</a><script>location.href="https://he.aliexpress.com/item/${ID}.html?aff_fcid=9"</script>`;
  const viaPage = await checkAffiliateLink("https://s.click.aliexpress.com/s/p", ID, hops({ "https://s.click.aliexpress.com/s/p": { status: 200, location: null, body: page } }));
  assert.equal(viaPage.status, "ok");
  // A page that only mentions another product: inconclusive, not "wrong product".
  const onlyOther = await checkAffiliateLink("https://s.click.aliexpress.com/s/p", ID, hops({ "https://s.click.aliexpress.com/s/p": { status: 200, location: null, body: '<a href="https://he.aliexpress.com/item/1005000000001.html">' } }));
  assert.equal(onlyOther.status, "broken");
  assert.match(onlyOther.detail, /not conclusive/);
  assert.equal(productIdFromUrl(`https://he.aliexpress.com/item/${ID}.html?x=1`), ID);
  assert.equal(productIdFromUrl(`https://star.aliexpress.com/share/share.htm?redirectUrl=${encodeURIComponent(`https://www.aliexpress.com/item/${ID}.html`)}`), ID);
});

test("link check job records results, unpublishes only definitive failures, and respects the run lock", async () => {
  const { db, rpc } = await freshDb();
  await runDiscovery({ rpc, categories, fetchPage: fakeProvider({ perTerm: 5 }).fetchPage, trigger: "test", maxCalls: 3 });
  const ids = (await db.query("select product_id from dp_products where status='published' order by product_id")).rows.map((r) => r.product_id);
  assert.ok(ids.length >= 4);
  const verdict = { [ids[0]]: "wrong_product", [ids[1]]: "broken", [ids[2]]: "not_aliexpress" };
  const check = async (link, id) => ({
    status: verdict[id] ?? "ok", hops: 2, finalHost: "he.aliexpress.com", finalProductId: id,
    affParams: verdict[id] ? [] : ["aff_fcid"], detail: verdict[id] ?? null,
  });
  const r = await runLinkCheck({ rpc, check, trigger: "test", maxChecks: 50 });
  assert.equal(r.status, "partial");
  assert.equal(r.stats.checked, ids.length);
  assert.equal(r.stats.unpublished, 2);
  assert.equal(r.stats.broken, 1);
  const st = async (id) => (await db.query("select status, link_status, reject_reasons from dp_products where product_id=$1", [id])).rows[0];
  assert.deepEqual(await st(ids[0]), { status: "unpublished", link_status: "wrong_product", reject_reasons: ["link_wrong_product"] });
  assert.equal((await st(ids[1])).status, "published", "inconclusive never unpublishes");
  assert.equal((await st(ids[2])).status, "unpublished");
  const sum = await rpc("dp_link_summary", {});
  assert.equal(sum.unpublished_by_link, 2);
  assert.equal(sum.with_aff_params, ids.length - 3);
  // Not due again for 7 days.
  assert.equal((await runLinkCheck({ rpc, check, trigger: "test", maxChecks: 50 })).stats.checked, 0);
  // Shares the one-job-at-a-time lock.
  const { id } = await rpc("dp_start_run", { kind: "price_refresh", trigger: "test" });
  await assert.rejects(runLinkCheck({ rpc, check, trigger: "test", maxChecks: 5 }), (e) => e.code === "DP409");
  await rpc("dp_finish_run", { id, status: "succeeded", stats: {}, error_codes: {} });
});

test("freshness label is honest and Hebrew", async () => {
  const { freshnessLabel } = await import("../lib/catalog-store/price-view.ts");
  const now = new Date("2026-11-16T12:00:00Z");
  assert.equal(freshnessLabel(null, now), null);
  assert.equal(freshnessLabel("garbage", now), null);
  assert.equal(freshnessLabel("2026-11-16T11:40:00Z", now), "המחיר נבדק בשעה האחרונה");
  assert.equal(freshnessLabel("2026-11-16T11:00:00Z", now), "המחיר נבדק לפני שעה");
  assert.equal(freshnessLabel("2026-11-16T07:00:00Z", now), "המחיר נבדק לפני 5 שעות");
  assert.equal(freshnessLabel("2026-11-15T10:00:00Z", now), "המחיר נבדק אתמול");
  assert.equal(freshnessLabel("2026-11-13T12:00:00Z", now), "המחיר נבדק לפני 3 ימים");
});

test("price re-check interval stays well below the daily schedule", async () => {
  const { PIPELINE_POLICY } = await import("../lib/catalog-store/pipeline.ts");
  // A price checked 17 h before the daily run must be re-checked by it (was skipped at 20 h).
  assert.ok(PIPELINE_POLICY.priceMinAgeHours <= 4, "min age " + PIPELINE_POLICY.priceMinAgeHours);
});
