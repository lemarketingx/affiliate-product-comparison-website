# Launch readiness, 2026-11-17

Branch `claude/sharp-meitner-w6pgaa`. Production is unchanged and nothing is merged to `main`.

The report has three groups. A fixture result never counts as live evidence.

## A. PASS with live evidence
Real Production site, real database or real CDN.

| # | Check | Evidence |
|---|---|---|
| A1 | All 46 published product images load from the real CDN | `ae-pic-a1.aliexpress-media.com`: 46/46 originals HTTP 200 |
| A2 | The CDN serves the smaller thumbnail the new card requests | 46/46 `_350x350.jpg` HTTP 200. Catalog page 1: 1,310 KB of originals vs 378 KB of thumbnails (−71%) |
| A3 | In a real browser on Production, no product image is broken | 10 page/viewport runs, 0 images with `naturalWidth = 0` |
| A4 | Purchase path on Production: product page → CTA → `/go` → affiliate link → click recorded | `/products/1005010579452804`: HTTP 200, price ₪58.39, "checked 16 Nov 14:55". CTA `href=/go/…?source=catalog`, `rel="sponsored noopener noreferrer"`. `/go/…?url=https://evil.test` returned 307 to the stored `s.click.aliexpress.com/s/…` link, ignoring the visitor URL. **One test click** was recorded in `dp_click_events` (id 2, 07:24:40 UTC, source `other`), about 3 s after the request. The `s.click` hop was not followed, so no click reached AliExpress |
| A5 | The redirect and click code on the branch matches the code tested in A4 | `git diff origin/main -- app/go lib/dealpilot/tracking.ts` is empty. The only change in the path is the read-side display rules (C1–C3) |
| A6 | Catalog has no duplicates | 0 duplicate `(source, product_id)`, 0 duplicate titles, 0 duplicate images among the 46 published |
| A7 | No stale price shown as current | Oldest published price is 19 h (limit 48 h). Every price is ILS from `target_sale_price`: 41 detail-checked, 5 confirmed |
| A8 | Every published product has an image, an affiliate link, a brand and a Hebrew title | 0 missing for each |
| A9 | Affiliate links that were checked lead to the same product | 16/16 `ok` (link job run #13, 8/8 ok with affiliate parameters) |

## B. PASS on the new branch with real data, run locally
Not a deployment. The 46 real rows were copied read-only from the database into a local server running this branch. Real images came from the CDN.

| # | Check | Result |
|---|---|---|
| B1 | Accessibility, axe-core WCAG 2.1 A/AA | **0 violations** on home, deals, category, search and product, mobile and desktop. Production `main` today: 10–16 colour-contrast violations on home, 1 on deals and category |
| B2 | Layout stability (CLS) | ≤ 0.042 on every page, after the font fix. Production `main`: up to 0.26 on search |
| B3 | Mobile image weight, deals | 69 KB vs 218 KB on Production. Desktop deals: 206 KB vs 677 KB |
| B4 | Mobile LCP: Pixel 7 profile, 4× CPU slowdown, 1.6 Mbps, 150 ms RTT | 1.48–1.79 s. Production `main`, same profile: 1.26–2.20 s. **Not comparable:** local has no network TTFB, so measure again on a Preview |
| B5 | Display rules on real rows | 45 listed: the Dreame parts-store listing is hidden and `/go` returns 404 for it. Promo banners are gone from titles. "car" holds 3 real car products; 5 wall chargers moved to tech |
| B6 | Mobile catalog: first product early | First card image at 441 px at 390×844 (was 605). Image and price on the first screen at 390 and 412. At 320 and 375 the image starts on the first screen |

## C. Fixes made in this round (code, with tests)
| # | Fix | Test |
|---|---|---|
| C1 | A store named after several brands, or a parts/spare store, no longer counts as brand proof (real case: "Roborock ECOVACS Dreame Vacuum Cleaner Parts Store Store"). It applies at read time too, so the existing row disappears without a DB edit | `tests/listing-rules.test.mjs` uses the real titles and store names |
| C2 | Seller sale banners ("מבצע חדש:", "【Top Sale】") are removed from displayed titles. Descriptive brackets stay | unit |
| C3 | "car" requires a car word in the title. Car-first brands (70mai, VIOFO, DDPAI) stay in "car" | unit |
| C4 | Image fallback: catches failures even before hydration, keeps the square box, shows the brand. Thumbnail first, then the original | e2e: image host blocked → fallback on card and product page |
| C5 | Mobile catalog: one-line disclosure that opens for detail, compact filters, tax note below the products, price above sales count | e2e at 320/375/390/412: first-screen position, disclosure visible, no horizontal scroll |
| C6 | Fonts `display: optional` + body-face preload (removed the font-swap jump) | measured (B2) |
| C7 | Honest empty state for a category with no verified products | visual |
| C8 | Temporary design page `/admin/design-lab` removed | build output has no `design-lab` route; `grep` finds no references |

Suite: typecheck OK · unit **118/118** · build OK · e2e **43/43** (one earlier full run had 1 intermittent failure on the first store test after a cold start; it passed alone and in the next full run).

## D. NOT VERIFIED or BLOCKED
| # | Item | Why / what is needed |
|---|---|---|
| D1 | **The new design on a real deployment** (Preview) | The Vercel connector has no access to this project, and the branch Preview URL is unknown. Owner: open the Preview for commit `HEAD` of this branch and send the link. If Preview has the database env vars, repeat B1–B4 there |
| D2 | **Name** | No name approved. Israeli trademarks and `.co.il` are NOT CHECKED (blocked here). See `docs/BRAND-NAMING.md` |
| D3 | **Discovery is stalled until about 2026-11-23** | All 24 search terms are "exhausted": results are sorted by sales and none is above 5,000 beyond what is stored. The daily target is 50; the actual is 0. Rules were not relaxed. **Owner decision:** add brands and terms (more models per brand, e.g. "Soundcore Liberty", "UGREEN Nexode") or accept a slower catalog |
| D4 | **The "home" category will be empty** after C1 | Its only product was the parts-store listing. The page now says so honestly. Fix: add home terms (D3) |
| D5 | **Dreame parts listing is still `published` in the DB** | Hidden by C1 on this branch, but Production (`main`) still shows it. Owner: unpublish product 1005009849771017 in `/admin/catalog` (one click). No direct DB edit was made |
| D6 | **30 of 46 affiliate links never checked** | The link job checks 8 per day, so full coverage takes about 4 more days. Consider raising the batch |
| D7 | **Availability and stock** | The API gives no stock field. Nothing on the site claims availability. NOT VERIFIED |
| D8 | **Checkout price match** | The price shown is the provider's `target_sale_price` for one SKU. A match with AliExpress checkout (coupons, variant, shipping) is NOT VERIFIED |
| D9 | **Price refresh margin** | It runs daily at about 04:43 UTC with a 20 h minimum age. One missed run pushes prices past 48 h, after which they are hidden (honest, but the catalog would go blank). Run #12 made 0 calls, which was correct: prices were 16 h old. Confirm run #14 (2026-11-18) updates them |
| D10 | Local cache isolation | The store cache key ignores `DEALPILOT_CACHE_NAMESPACE`, so local servers can read each other's cached catalog. Production is unaffected (one cache per deployment) |
| D11 | OG image | Waits for the name |

## Owner actions, in order
1. Trademark and `.co.il` check for **תחתית** (and **סופית** as backup).
2. Unpublish product 1005009849771017 (D5).
3. Decide on new discovery terms (D3/D4).
4. Send the Preview link for this branch (D1), then I repeat the live checks on it.
5. Merge approval, only after 1–4.
