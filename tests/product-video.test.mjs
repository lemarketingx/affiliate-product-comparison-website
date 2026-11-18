// Seller product videos: normaliser allowlist, storage through the real SQL (pglite),
// and the read path. TEST FIXTURE data only — no real video URL has been observed yet.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { runDiscovery, runPriceRefresh } from "../lib/catalog-store/pipeline.ts";
import { normalizeProductResponse, parseProductPage, safeUrl, PRODUCT_DETAIL_ROOT } from "../lib/aliexpress/normalize.ts";

const QUERY_ROOT = "aliexpress_affiliate_product_query_response";
const VIDEO = "https://video.aliexpress-media.com/play/u/ae_sg_item/fixture/p/1/e/6/t/10301/1100000000001.mp4";

async function freshDb() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(f, dir), "utf8"));
  const rpc = async (fn, args) => {
    assert.match(fn, /^dp_[a-z_]+$/);
    const r = await db.query(`select public.${fn}($1::jsonb) as r`, [JSON.stringify(args ?? {})]);
    return r.rows[0].r;
  };
  return { db, rpc };
}

function row(id, video) {
  const r = {
    product_id: id,
    product_title: `UGREEN מטען מהיר TEST FIXTURE ${id}`,
    shop_name: "UGREEN Official Store",
    product_main_image_url: `https://ae01.alicdn.com/kf/fixture-${id}.jpg`,
    product_detail_url: `https://www.aliexpress.com/item/${id}.html`,
    promotion_link: `https://s.click.aliexpress.com/e/_fixture${id}`,
    lastest_volume: 9000,
    evaluate_rate: "97.5%",
    sku_id: "12000" + id.slice(-4),
    sale_price: "12.40", sale_price_currency: "USD",
    target_sale_price: "45.90", target_sale_price_currency: "ILS",
  };
  if (video !== undefined) r.product_video_url = video;
  return r;
}
const wrap = (root, rows) => ({ [root]: { resp_result: { resp_code: 200, resp_msg: "ok", result: { current_record_count: rows.length, total_record_count: rows.length, products: { product: rows } } } } });

test("video URLs: https on AliExpress video hosts only; rejected hosts are reported by hostname", () => {
  assert.equal(safeUrl(VIDEO, "video"), VIDEO);
  assert.equal(safeUrl("https://cloud.video.taobao.com/play/u/1/p/1/e/6/t/1/2.mp4", "video"), "https://cloud.video.taobao.com/play/u/1/p/1/e/6/t/1/2.mp4");
  assert.equal(safeUrl("http://video.aliexpress-media.com/x.mp4", "video"), null, "http is refused");
  assert.equal(safeUrl("https://evil.example/x.mp4", "video"), null);
  assert.equal(safeUrl("https://taobao.com.evil.example/x.mp4", "video"), null);
  assert.equal(safeUrl("https://www.aliexpress.com/item/1.html", "video"), null, "a product page is not a video host");
  assert.equal(safeUrl("javascript:alert(1)", "video"), null);

  const [ok, bad, none, broken] = normalizeProductResponse(wrap(QUERY_ROOT, [
    row("1005900000001", VIDEO),
    row("1005900000002", "https://cdn.evil.example/clip.mp4?token=secret"),
    row("1005900000003"),
    row("1005900000004", "not a url"),
  ]));
  assert.equal(ok.video, VIDEO);
  assert.equal(ok.videoRejectedHost, null);
  assert.equal(bad.video, null);
  assert.equal(bad.videoRejectedHost, "cdn.evil.example", "hostname only: no path or query is kept");
  assert.equal(none.video, null);
  assert.equal(none.videoRejectedHost, null);
  assert.equal(broken.videoRejectedHost, "invalid-url");
});

test("discovery stores videos, reports diagnostics, and a later answer without a video keeps it", async () => {
  const { db, rpc } = await freshDb();
  const rowsFor = (withVideo) => [
    row("1005900000001", withVideo ? VIDEO : undefined),
    row("1005900000002", "https://cdn.evil.example/clip.mp4"),
    row("1005900000003"),
  ];
  let withVideo = true;
  const fetchPage = async (term, pageNo, pageSize) => parseProductPage(wrap(QUERY_ROOT, pageNo === 1 ? rowsFor(withVideo) : []), pageNo, pageSize);
  const categories = [{ slug: "tech", label: "טכנולוגיה", terms: ["UGREEN"] }];
  const first = await runDiscovery({ rpc, categories, fetchPage, trigger: "test", maxCalls: 1 });
  assert.deepEqual(first.stats.videos, { seen: 2, accepted: 1, stored: 1, writeFailed: 0, rejectedHosts: { "cdn.evil.example": 1 } });
  const stored = async () => (await db.query("select product_id, video_url from dp_products order by product_id")).rows;
  assert.deepEqual((await stored()).map((r) => r.video_url), [VIDEO, null, null]);

  // The catalog read returns the column.
  const list = await rpc("dp_catalog", {});
  assert.equal(list.find((r) => r.product_id === "1005900000001").video_url, VIDEO);
  assert.equal(list.find((r) => r.product_id === "1005900000003").video_url, null);

  // Re-ingest without the field (provider omitted it): the stored video stays.
  withVideo = false;
  await db.query("update dp_term_cursors set next_page = 1, exhausted_at = null");
  const second = await runDiscovery({ rpc, categories, fetchPage, trigger: "test", maxCalls: 1 });
  assert.equal(second.stats.rows, 3, "the rows were really re-ingested");
  assert.equal(second.stats.videos.accepted, 0);
  assert.equal((await stored())[0].video_url, VIDEO);
});

test("price refresh also captures videos by product ID", async () => {
  const { db, rpc } = await freshDb();
  const fetchPage = async (term, pageNo, pageSize) => parseProductPage(wrap(QUERY_ROOT, pageNo === 1 ? [row("1005900000001")] : []), pageNo, pageSize);
  await runDiscovery({ rpc, categories: [{ slug: "tech", label: "טכנולוגיה", terms: ["UGREEN"] }], fetchPage, trigger: "test", maxCalls: 1 });
  const fetchDetails = async (ids) => ({ products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, ids.map((id) => row(id, VIDEO))), PRODUCT_DETAIL_ROOT), missing: [] });
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 2, minAgeHours: 0 });
  assert.equal(r.status, "succeeded");
  assert.equal(r.stats.videos.stored, 1);
  assert.equal((await db.query("select video_url from dp_products")).rows[0].video_url, VIDEO);
});

test("dp_set_videos refuses non-https values and is not callable by anon", async () => {
  const { db, rpc } = await freshDb();
  const fetchPage = async (term, pageNo, pageSize) => parseProductPage(wrap(QUERY_ROOT, pageNo === 1 ? [row("1005900000001")] : []), pageNo, pageSize);
  await runDiscovery({ rpc, categories: [{ slug: "tech", label: "טכנולוגיה", terms: ["UGREEN"] }], fetchPage, trigger: "test", maxCalls: 1 });
  const res = await rpc("dp_set_videos", { items: [
    { product_id: "1005900000001", video_url: "javascript:alert(1)" },
    { product_id: "1005900000001", video_url: 'https://x.alicdn.com/a" onerror="x' },
  ] });
  assert.equal(res.updated, 0);
  await db.exec("set role anon");
  await assert.rejects(db.query("select public.dp_set_videos('{}'::jsonb)"), /permission denied/);
});

test("a failing video write never fails the price job", async () => {
  const { rpc: realRpc } = await freshDb();
  const fetchPage = async (term, pageNo, pageSize) => parseProductPage(wrap(QUERY_ROOT, pageNo === 1 ? [row("1005900000001")] : []), pageNo, pageSize);
  await runDiscovery({ rpc: realRpc, categories: [{ slug: "tech", label: "טכנולוגיה", terms: ["UGREEN"] }], fetchPage, trigger: "test", maxCalls: 1 });
  const rpc = async (fn, args) => {
    if (fn === "dp_set_videos") throw new Error("function does not exist");
    return realRpc(fn, args);
  };
  const fetchDetails = async (ids) => ({ products: normalizeProductResponse(wrap(PRODUCT_DETAIL_ROOT, ids.map((id) => row(id, VIDEO))), PRODUCT_DETAIL_ROOT), missing: [] });
  const r = await runPriceRefresh({ rpc, fetchDetails, trigger: "test", maxCalls: 2, minAgeHours: 0 });
  assert.equal(r.status, "succeeded");
  assert.equal(r.stats.updated, 1);
  assert.equal(r.stats.videos.writeFailed, 1);
});
