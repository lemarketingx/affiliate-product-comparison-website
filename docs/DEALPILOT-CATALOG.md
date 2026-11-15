# Public catalog: 500+ products, staged and honest

## What changed

- `queryAffiliateProductsPage({ keywords, pageNo, pageSize, guard })` in `lib/aliexpress/affiliate.ts` validates input (`lib/aliexpress/query.ts`): keywords are 2–120 characters with no control characters, `page_no` is 1–100 and `page_size` is 1–50. It also returns the provider's paging counters (`current_record_count`, `total_record_count`), and unknown counters stay `null`. `queryAffiliateProducts(keywords, pageSize, pageNo)` remains backward compatible. `sort=LAST_VOLUME_DESC`, `target_currency=ILS`, `target_language=HE` and `ship_to_country=IL` are unchanged.
- **Search plan**: 8 categories × 5 phrases each (`lib/dealpilot/categories.ts`) × up to 3 pages, which is 120 pages at most. The order is page 1 of every phrase, round-robin across categories, then page 2, then page 3. A deeper page is requested only if the previous page of the same phrase was full.
- **Page size**: the third-party SDK documentation states 1–50. The live value is verified at runtime: the first call tries 50, and if the provider rejects the parameter the builder falls back to 40, then 20, then 10. The accepted size is reused afterwards and shown in the report.
- **Dedupe** by `product_id`. The first phrase that found a product sets its category.
- **Public rules** (`publicRejections` in `lib/aliexpress/catalog-build.ts`):
  - more than 5,000 reported sales (`lastest_volume`);
  - price in ILS;
  - Hebrew supplier title;
  - valid price, image and product URL;
  - a valid https affiliate link on an AliExpress or `s.click.aliexpress.com` host that differs from the product URL.

  `quality.ts` is unchanged: rating, Israeli reviews and Israel delivery stay "not verified" unless real evidence exists. `/go` and product pages only resolve published products.
- **Ordering**: highest reported sales first within each category, with categories interleaved.

## Quotas, caching and speed

- **A page view never waits on AliExpress.**
  - The assembled catalog is a single shared cache entry, refreshed every 6 hours with stale-while-revalidate.
  - Every view after the first build reads that one entry, which takes milliseconds.
  - A cold build (first ever, or after a cache reset) holds a view for at most `DEALPILOT_CATALOG_WAIT_MS` (default 2.5 s). After that the view shows "הקטלוג מתעדכן ממש עכשיו", and the build finishes after the response (`after()` from `next/server`).
- **Banners work the same way.** The homepage waits at most 1.5 s, then shows category gates while the banner check completes in the background. Campaign product lookups run in parallel.
- **Result pages are cached individually** (6, 8 or 10 hours, staggered), so a rebuild reuses them.
- **Limits:**
  - per-process ceiling of `DEALPILOT_CATALOG_HOURLY_LIMIT` (default 150) catalog calls per hour;
  - a quota error stops the build immediately;
  - fetching stops at 650 publishable products;
  - provider calls time out after 8 s.
- **Measured locally** against the fixture API with a simulated 700 ms provider latency, starting from an empty cache. Times are for the homepage.

  | Request | Before | After |
  |---|---|---|
  | 1st | 4.3 s | 2.6 s (then shows "מתעדכן") |
  | 2nd | 1.6 s | 0.04 s |
  | Later | about 0.03 s | about 0.02 s |

  On Vercel the "before" behaviour was worse: every new serverless instance rebuilt the catalog from about 120 cache reads, plus up to 12 provider calls.

## Site

- `/deals`, `/search` and `/categories/[slug]` are server-rendered with 24 products per page. They support search (multi-word, Hebrew-aware), a category filter, four sort orders and a numbered pager. They work without JavaScript, and only 24 cards are sent per page.
- The status line shows real counts: "X מוצרים עברו את הסינון מתוך Y שפורסמו · מוצגים 25–48 · עמוד 2 מתוך N".
- If fewer than 500 products are published, the catalog shows the real number and the main reasons, and links to `/catalog-status`.
- `/catalog-status` (noindex) is the build report, and it also shows why official banners are or are not published. It shows API rows, unique products, rejected products by first and by all reasons, published products, duplicates, pages fetched, pending, failed and skipped, the page size tried and accepted, provider error codes, per-phrase `total_record_count`, and how many products would pass at more than 500, 1,000 and 5,000 sales (diagnostic only).
- Card images use the AliExpress CDN `_350x350.jpg` thumbnail. If that fails, the original image is loaded, and after that a placeholder. The first 4 cards load eagerly and the rest lazily.

## Tests

- **Unit** (`tests/catalog.test.mjs`): input validation, paging counters, every public rule including the boundary at exactly 5,000, plan order, dedupe, page-size fallback, deeper-page logic, target stop, budget deferral, quota stop, provider outage, filtering and pagination.
- **E2E** (`tests/e2e/catalog.spec.ts`) runs on an isolated port-3104 server with a large TEST FIXTURE catalog. It checks:
  - 500+ unique products and 24 per page with no repeats;
  - the pager, the last page, an out-of-range page, category, search and sort;
  - thumbnails load;
  - no horizontal scroll at 304, 375 and 1440;
  - the report adds up (unique = rejected + published);
  - `/go` redirects to the affiliate link;
  - a rejected product has no page and no redirect.
