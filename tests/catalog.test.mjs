import test from "node:test";
import assert from "node:assert/strict";
import { validateProductQuery, parsePageMeta, PAGE_SIZE_LIMIT } from "../lib/aliexpress/query.ts";
import { buildCatalog, buildFetchPlan, publicRejections, validAffiliateUrl, CATALOG_POLICY } from "../lib/aliexpress/catalog-build.ts";
import { filterCatalog, pageWindow, parseViewParams, viewHref } from "../lib/aliexpress/catalog-view.ts";

const cats = [
  { slug: "a", label: "A", terms: ["alpha one", "alpha two"] },
  { slug: "b", label: "B", terms: ["beta one"] },
];
let seq = 0;
const product = (over = {}) => {
  const id = String(1005000000000 + ++seq);
  return {
    id, title: "מוצר בדיקה " + id, price: "19.90", currency: "ILS",
    image: "https://ae01.alicdn.com/kf/x.jpg", productUrl: `https://www.aliexpress.com/item/${id}.html`,
    affiliateUrl: `https://s.click.aliexpress.com/e/${id}`, commissionRate: "5%", orders: 9000,
    shipTo: null, requestedCountry: "IL", titleLanguage: "he", images: [], shopName: null,
    positiveFeedbackPercent: null, quality: { rating: null, israelReviews: null, shipping: null }, ...over,
  };
};
const page = (products, pageSize, total = 1000) => ({ products, meta: { pageNo: 1, pageSize, currentRecordCount: products.length, totalRecordCount: total } });

test("query input validation: page_no / page_size bounds, keywords sanitised", () => {
  assert.deepEqual(validateProductQuery({ keywords: "  usb   hub " }), { keywords: "usb hub", pageNo: 1, pageSize: 10 });
  assert.deepEqual(validateProductQuery({ keywords: "usb hub", pageNo: 3, pageSize: 50 }), { keywords: "usb hub", pageNo: 3, pageSize: 50 });
  assert.equal(PAGE_SIZE_LIMIT, 50);
  for (const bad of [
    { keywords: "x" }, { keywords: "a".repeat(121) }, { keywords: "bad\u0000word" }, { keywords: 5 },
    { keywords: "ok ok", pageNo: 0 }, { keywords: "ok ok", pageNo: 1.5 }, { keywords: "ok ok", pageNo: 101 }, { keywords: "ok ok", pageNo: NaN },
    { keywords: "ok ok", pageSize: 0 }, { keywords: "ok ok", pageSize: 51 }, { keywords: "ok ok", pageSize: "50" },
  ]) assert.throws(() => validateProductQuery(bad), (e) => e.status === 400, JSON.stringify(bad));
});
test("page meta: provider counters parsed, unknown stays null (never 0)", () => {
  const ok = { aliexpress_affiliate_product_query_response: { resp_result: { resp_code: 200, result: { current_record_count: "50", total_record_count: 8123 } } } };
  assert.deepEqual(parsePageMeta(ok, 2, 50), { pageNo: 2, pageSize: 50, currentRecordCount: 50, totalRecordCount: 8123 });
  assert.deepEqual(parsePageMeta({}, 1, 10), { pageNo: 1, pageSize: 10, currentRecordCount: null, totalRecordCount: null });
  const odd = { aliexpress_affiliate_product_query_response: { resp_result: { result: { total_record_count: -4, current_record_count: "" } } } };
  assert.equal(parsePageMeta(odd, 1, 10).totalRecordCount, null);
  assert.equal(parsePageMeta(odd, 1, 10).currentRecordCount, null);
});

test("public rules: >5000 sales, ILS, Hebrew, product data and a real affiliate link", () => {
  assert.deepEqual(publicRejections(product()), []);
  assert.deepEqual(publicRejections(product({ orders: 5000 })), ["sales"]);
  assert.deepEqual(publicRejections(product({ orders: 5001 })), []);
  assert.deepEqual(publicRejections(product({ orders: null })), ["sales"]);
  assert.deepEqual(publicRejections(product({ currency: "USD" })), ["currency"]);
  assert.deepEqual(publicRejections(product({ title: "English only title" })), ["hebrew"]);
  assert.ok(publicRejections(product({ price: "0" })).includes("price"));
  assert.ok(publicRejections(product({ image: null })).includes("image"));
  assert.ok(publicRejections(product({ affiliateUrl: null })).includes("affiliate"));
  const p = product();
  assert.ok(publicRejections({ ...p, affiliateUrl: p.productUrl }).includes("affiliate"));
  assert.equal(validAffiliateUrl("https://s.click.aliexpress.com.evil.test/e/x", null), false);
  assert.equal(validAffiliateUrl("http://s.click.aliexpress.com/e/x", null), false);
  assert.equal(validAffiliateUrl("https://s.click.aliexpress.com:8443/e/x", null), false);
  assert.equal(validAffiliateUrl("https://s.click.aliexpress.com/e/x", null), true);
  // Unverified quality evidence never becomes a pass or a block for listing.
  assert.equal(product().quality.rating, null);
});

test("fetch plan: page 1 of every term across categories first, then deeper pages", () => {
  const plan = buildFetchPlan(cats, 2);
  assert.deepEqual(plan.map((p) => `${p.term}#${p.pageNo}`), [
    "alpha one#1", "beta one#1", "alpha two#1", "alpha one#2", "beta one#2", "alpha two#2",
  ]);
});

test("build: dedupes by product_id, filters, sorts by sales and reports honestly", async () => {
  const shared = product({ orders: 20000 });
  const pages = {
    "alpha one#1": [product({ orders: 7000 }), shared, product({ orders: 400 }), product({ currency: "USD" })],
    "beta one#1": [shared, product({ affiliateUrl: null }), product({ orders: 12000 })],
    "alpha two#1": [product({ title: "no hebrew" })],
  };
  const calls = [];
  const { items, report } = await buildCatalog({
    categories: cats,
    fetchPage: async (item, size) => { calls.push([item.term, item.pageNo, size]); return page(pages[item.term + "#" + item.pageNo] ?? [], size); },
    now: () => new Date("2026-11-15T10:00:00Z"),
  });
  assert.equal(report.rawRows, 8);
  assert.equal(report.duplicates, 1);
  assert.equal(report.uniqueProducts, 7);
  assert.equal(report.published, 3);
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map((i) => i.id)).size, 3);
  assert.equal(items.find((i) => i.id === shared.id).categorySlug, "a"); // first term that found it wins
  assert.deepEqual(items.filter((i) => i.categorySlug === "a").map((i) => i.orders), [20000, 7000]);
  assert.equal(report.rejectedTotal, 4);
  assert.deepEqual(report.rejectedPrimary, { sales: 1, currency: 1, affiliate: 1, hebrew: 1 });
  assert.equal(report.salesBands.over5000, 3);
  // Short pages mean the term is exhausted: no page 2 requests.
  assert.ok(calls.every(([, pageNo]) => pageNo === 1));
  assert.equal(report.pagesSkippedExhausted, 6); // 3 terms × pages 2–3
  assert.equal(report.pageSize.accepted, 50);
  assert.ok(report.shortfall[0].includes("פורסמו 3"));
  assert.ok(report.shortfall.some((s) => s.includes("5,000")));
});

test("build: page-size probe falls back when the provider rejects 50, then sticks to the accepted size", async () => {
  const sizes = [];
  const { report, acceptedPageSize } = await buildCatalog({
    categories: cats,
    fetchPage: async (item, size) => {
      sizes.push(size);
      if (size > 20) throw Object.assign(new Error("x"), { code: "PROVIDER_RESULT_402_INVALID_PARAMETER" });
      return page([product()], size);
    },
  });
  assert.deepEqual(sizes.slice(0, 3), [50, 40, 20]);
  assert.ok(sizes.slice(3).every((s) => s === 20));
  assert.equal(acceptedPageSize, 20);
  assert.deepEqual(report.pageSize, { tried: [50, 40, 20], accepted: 20 });
});

test("build: full pages lead to deeper pages; stops at the target buffer; never invents rows", async () => {
  let calls = 0;
  const { items, report } = await buildCatalog({
    categories: cats,
    policy: { stopAt: 120, maxPagesPerTerm: 5 },
    fetchPage: async (item, size) => { calls++; return page(Array.from({ length: size }, () => product()), size); },
  });
  assert.ok(items.length >= 120 && items.length < 120 + 50 * 4 + 1);
  assert.ok(report.pagesSkippedTargetMet > 0);
  assert.equal(report.published, items.length);
  assert.equal(calls, report.pagesFetched);
});

test("build: per-request budget defers pages; quota errors stop the build and are reported", async () => {
  const deferred = await buildCatalog({
    categories: cats,
    fetchPage: async (item, size) => {
      if (item.term !== "alpha one") throw Object.assign(new Error("d"), { code: "CATALOG_DEFERRED" });
      return page(Array.from({ length: size }, () => product()), size);
    },
    policy: { maxPagesPerTerm: 2 },
  });
  assert.equal(deferred.report.pagesFailed, 0);
  assert.ok(deferred.report.pagesPending >= 2);
  assert.ok(deferred.report.shortfall.some((s) => s.includes("עדיין לא נשלפו")));

  let n = 0;
  const quota = await buildCatalog({
    categories: cats,
    knownPageSize: 50,
    policy: { concurrency: 1 },
    fetchPage: async () => { if (++n === 2) throw Object.assign(new Error("q"), { code: "PROVIDER_ERROR_ApiCallLimit" }); return page([product()], 50); },
  });
  assert.equal(quota.report.quotaStopped, true);
  assert.equal(n, 2);
  assert.equal(quota.report.errorCodes.PROVIDER_ERROR_ApiCallLimit, 1);
  assert.ok(quota.report.pagesPending > 0);
  assert.equal(quota.items.length, 1);
});

test("build: unavailable provider yields zero products and an honest report, not filler", async () => {
  const { items, report } = await buildCatalog({
    categories: cats,
    fetchPage: async () => { throw Object.assign(new Error("u"), { code: "PROVIDER_UNREACHABLE" }); },
  });
  assert.equal(items.length, 0);
  assert.equal(report.published, 0);
  assert.ok(report.pagesFailed >= 1);
  assert.ok(report.shortfall[0].includes("לא הוספנו"));
});

test("view: search (multi-word, Hebrew), category, sort and 24-per-page pagination with real totals", () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ title: (i % 2 ? "מטען מהיר " : "כבל ") + i, categorySlug: i % 3 ? "tech" : "home", orders: 6000 + i, price: String(100 - i), shopName: null }));
  let v = filterCatalog(items, { q: "", cat: "", sort: "popular", page: 1 });
  assert.equal(v.total, 60); assert.equal(v.items.length, 24); assert.equal(v.pages, 3);
  v = filterCatalog(items, { q: "", cat: "", sort: "popular", page: 3 });
  assert.equal(v.items.length, 12); assert.equal(v.start, 48);
  v = filterCatalog(items, { q: "", cat: "", sort: "popular", page: 99 });
  assert.equal(v.page, 3);
  v = filterCatalog(items, { q: "מטען  מהיר", cat: "tech", sort: "orders", page: 1 });
  assert.ok(v.items.every((i) => i.title.startsWith("מטען") && i.categorySlug === "tech"));
  assert.equal(v.items[0].orders, 6059);
  v = filterCatalog(items, { q: "", cat: "", sort: "price-asc", page: 1 });
  assert.equal(v.items[0].price, "41");
  v = filterCatalog(items, { q: "לא קיים", cat: "", sort: "popular", page: 1 });
  assert.equal(v.total, 0); assert.equal(v.pages, 1);
  assert.equal(CATALOG_POLICY.perPage >= 24 && CATALOG_POLICY.perPage <= 36, true);
});
test("view params: sanitised; page window; hrefs keep filters", () => {
  assert.deepEqual(parseViewParams({ q: "  usb  ", cat: "evil", sort: "x", page: "-3" }, ["tech"]), { q: "usb", cat: "", sort: "popular", page: 1 });
  assert.deepEqual(parseViewParams({ q: ["a", "b"], cat: "tech", sort: "orders", page: "4" }, ["tech"]), { q: "a", cat: "tech", sort: "orders", page: 4 });
  assert.deepEqual(pageWindow(6, 20), [1, "gap", 4, 5, 6, 7, 8, "gap", 20]);
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.equal(viewHref("/deals", { q: "usb hub", cat: "tech", sort: "orders", page: 2 }), "/deals?q=usb+hub&cat=tech&sort=orders&page=2");
  assert.equal(viewHref("/categories/tech", { cat: "tech", page: 1, sort: "popular" }, true), "/categories/tech");
});
