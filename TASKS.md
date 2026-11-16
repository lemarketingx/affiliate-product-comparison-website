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
| Create dedicated Supabase project and apply migration | blocked (owner approval; see PROGRESS.md) |
| Live verification: real import, no duplicates on rerun, price vs AliExpress page sample of 20 products | blocked (credentials/env) |
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
