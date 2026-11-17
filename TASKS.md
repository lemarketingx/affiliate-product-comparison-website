# TASKS — prioritised backlog

Status: `todo` · `doing` · `done` · `blocked (reason)`. Order = business impact. One feature finished before the next starts.

## Phase 1 — business foundations
| Task | Status |
|---|---|
| Persistent catalog DB schema + RLS + service-only functions | done (pglite verified) |
| Import pipeline with cursors, validation, dedupe, logging, retry | done (fixture verified) |
| Raw price fields + price history + product-ID price refresh | done (fixture verified) |
| Stale-price withholding on storefront | done (unit verified) |
| Admin catalog dashboard + run-now + unpublish | done (not browser-tested with real DB) |
| Daily Vercel cron (`CRON_SECRET`) | done, blocked (owner must set env + deploy) |
| Click persistence (no personal data) | done, blocked (DB env) |
| Create dedicated Supabase project and apply migrations | done (owner created `dealpilot`; both migrations applied) |
| Live import (1,715 products, 46 published, rerun = 15 updates, 0 inserts duplicated) | done (owner run, read from DB) |
| Price vs AliExpress page sample of 20 products | blocked (needs a successful live price refresh first) |
| Fix price refresh 402 INVALID_PARAMETER (profile fallback, provider message, currency-safe recording) | done (code + real-DB migration); live re-run blocked (owner trigger) |
| Price refresh live: 402 solved (`country_only`), 20 products checked | done (run #6) |
| Pace provider calls, ride out 1 s bans, separate import/price jobs, one job at a time | done (code + real-DB migrations; live re-run pending) |
| Next price run: confirm `ils_no_tracking` is accepted | done (run #8: first call, 26/26 identical to search) |
| Return the 15 USD-priced products to ILS | done (run #9: all 46 in ILS) |
| Affiliate link verification job (same product, stays on AliExpress, affiliate params) | done (live run #10: 8/8 OK, same product, aff params present) |
| Confirm attribution in AliExpress portal (today's clicks appear under our tracking id) | todo (owner, portal) |
| Why does productdetail.get reject our tracking_id? (search accepts links fine) | todo (check AliExpress portal tracking id) |
| Product page: show price age + price history chart from `dp_price_history` | todo |
| Verified conversions/commissions import (orders API, needs permission) | blocked (API permission, see docs/ALIEXPRESS-ORDERS.md) |
| Branch protection: require CI check on `main` | todo (owner setting) |
| Investigate and repair 15 e2e tests that fail identically on `main` | done: 13 fixed (1 real defect: homepage h1); 2 await owner decision |
| Decide: restore 'not in the box' block on product page, or delete its e2e test | todo (owner) |
| Rewrite populated-flow e2e for the brand-first catalog | todo |
| Set Production env vars in Vercel (DB, CRON_SECRET, AliExpress keys) so crons run after merge | todo (owner) |

## Phase 2 — brand and UX (in progress)
| Task | Status |
|---|---|
| Name shortlist with evidence | round 3 (`docs/BRAND-NAMING.md`): מחיר אמת withdrawn (same-category uses); lead candidate **תחתית**, backup סופית; trademarks and `.co.il` NOT CHECKED; owner check needed |
| Symbol, favicon, lockups | done |
| 3 directions + incumbent scored | done: A chosen |
| Token layer + product card + product page in A | done |
| Header/footer shell in A (remove airport copy, fix empty search button) | done |
| Home, deals/search/category, loading/error/404 in A | done |
| OG image | todo |
| Rewrite 2 owner-decision e2e tests with roles and labels | done: "not in the box" test replaced by owner decision; populated-flow rewritten with branded products |
| Accessibility (axe WCAG 2.1 AA) and LCP | done: 0 violations on 8 pages × 2 widths; mobile home LCP 748 ms (baseline 788) |
| Mobile catalog: first products early | done: first card image at 441 px at 390×844 (was 605); e2e at 320/375/390/412 |
| Legacy no-DB `/go` answers 503 for up to 15 s while a cold catalog builds | todo (production reads the DB, so not affected there) |
| Remove `/admin/design-lab` before merge | done |
| Apply approved name (metadata, wordmark, domain) | blocked: owner approval |

## Launch readiness (see `docs/LAUNCH-READINESS.md`)
| Task | Status |
|---|---|
| Real images on Production + thumbnail on the real CDN | done: 46/46 and 46/46 thumbnails HTTP 200 |
| Image fallback (pre-hydration failures too) | done, e2e |
| Live purchase path (product → /go → affiliate → click row) | done: one test click, row id 2 |
| Catalog audit (duplicates, stale prices, links, unverified data) | done: parts store, promo banners and car category fixed at read time |
| a11y and performance on real data | done locally (axe 0, CLS ≤ 0.042); Preview run blocked (no Vercel access) |
| Unpublish Dreame parts listing 1005009849771017 on Production | owner (admin, one click) |
| New discovery terms: all 24 terms exhausted until ~2026-11-23; home category empty | owner decision |
| Link check covers 8/day; 30/46 unchecked | todo: raise batch |
| Store cache key ignores `DEALPILOT_CACHE_NAMESPACE` (local tests only) | todo |
| Intermittent: first store e2e after cold start (1 of 3 full runs) | todo: investigate |

## Phase 3 — competitive edge
Israel vs abroad comparison (needs permitted Israeli price sources), import-cost calculator with sourced, dated tax rules, deal detection from stored price history (needs ≥ 30 days of history). todo

## Phase 4 — shopping experience
Videos (YouTube Data API first), smart recommendations, price alerts, buying guides, SEO content. todo

## Phase 5 — automation and growth
Content marketing, business reports, conversion optimisation, monitoring/alerting. todo
