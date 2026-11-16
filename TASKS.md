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
| Affiliate link verification job (same product, stays on AliExpress, affiliate params) | done (code + real-DB migration); first live run pending owner button |
| Why does productdetail.get reject our tracking_id? (search accepts links fine) | todo (check AliExpress portal tracking id) |
| Product page: show price age + price history chart from `dp_price_history` | todo |
| Verified conversions/commissions import (orders API, needs permission) | blocked (API permission, see docs/ALIEXPRESS-ORDERS.md) |
| Branch protection: require CI check on `main` | todo (owner setting) |
| Investigate and repair 15 e2e tests that fail identically on `main` (cause not yet investigated) | todo (before phase 2 design work) |

## Phase 2 — brand and UX
Naming research + logo set, 3 design directions → pick one, homepage/product/search redesign, visual QA 320–1920px. todo

## Phase 3 — competitive edge
Israel vs abroad comparison (needs permitted Israeli price sources), import-cost calculator with sourced, dated tax rules, deal detection from stored price history (needs ≥ 30 days of history). todo

## Phase 4 — shopping experience
Videos (YouTube Data API first), smart recommendations, price alerts, buying guides, SEO content. todo

## Phase 5 — automation and growth
Content marketing, business reports, conversion optimisation, monitoring/alerting. todo
