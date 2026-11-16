# SPEC — Milestone 1: persistent catalog, import pipeline and accurate prices

Scope: PRODUCT-VISION §28 (stabilise catalog engine, product import and prices). Branding, design, comparison, videos and SEO are later milestones (see TASKS.md).

## Problem found in the existing code (2026-11-16)
1. **No persistence.** The catalog existed only in `unstable_cache` entries rebuilt from keyword searches every 6 h; a cold cache meant a page view triggered provider calls. Admin approvals lived in browser memory. Clicks were not stored (`tracking.ts` disabled).
2. **No "new products" notion.** The fixed plan (24 terms × 3 pages, sorted by sales) returns the same products every rebuild; there is no first-seen date, so "50 new/day" could not be measured or achieved.
3. **Price gap root causes (from code + the 2026-11-14 live probe field list):**
   - The shown price is `target_sale_price` from a *keyword search* row, cached up to 6 h+ and displayed without its age.
   - The provider returns several prices per row: `sale_price` (USD), `target_sale_price` (ILS), `app_sale_price` / `target_app_sale_price` (app-only price, often lower), `original_price` / `target_original_price`. The row also carries one `sku_id` — the price belongs to that variant, while the affiliate link opens the product page on whatever variant AliExpress selects.
   - ILS amounts are AliExpress's own conversion; checkout may use another currency/rate.
   - Personal coupons, new-user prices and shipping are never in the affiliate API.
   - Nothing was stored, so the gap could not be measured.

## Acceptance criteria and status
Status legend: PASS (verified with evidence) · FAIL · BLOCKED (external dependency) · NOT TESTED.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Persistent DB schema: products unique by (source, product_id), price history, runs, events, cursors, clicks | PASS (pglite) | `supabase/migrations/20261116000000_dealpilot_catalog_store.sql`, `tests/catalog-store.test.mjs` |
| 2 | RLS on; anon/authenticated cannot read tables or call functions | PASS (pglite) | test "anon and authenticated roles cannot…" |
| 3 | Pipeline validates with the existing public rules; rejected rows store reasons | PASS (fixture) | test "discovery persists…" |
| 4 | Re-running the import creates no duplicate products; already-published products are not counted as new | PASS (fixture) | same test, third run `inserted=0`, `publishedNew=0` |
| 5 | Resumable per-term cursor → deeper pages on later runs → new unique products | PASS (fixture) | page 2 requested on run 2; exhausted terms restart after 7 days |
| 6 | Failures logged, cursor kept, retried next run; quota stops the run; all-failed run = failed; crashed run closed | PASS (fixture) | tests "provider failures…", "a crashed run…" |
| 7 | Every raw price field + chosen field + sku stored per observation (append-only history) | PASS (fixture) | normaliser + price refresh tests |
| 8 | Product-ID price refresh (`productdetail.get`, batches ≤ 20, budgeted, scheduled; never per page view) | PASS (fixture) / BLOCKED (live) | no AliExpress credentials in this environment |
| 9 | Stale (> 48 h) or unknown price is withheld on the storefront | PASS (unit) | `displayPrice` tests; `rowToItem` |
| 10 | Admin dashboard: totals, new today vs 50 target, rejected reasons, no-current-price count, price gaps with raw fields, runs, errors, clicks; run-now and unpublish actions | Implemented; NOT TESTED in browser with a real DB | `/admin/catalog` |
| 11 | Daily scheduled job, secret-protected, fails closed | Implemented; BLOCKED (deploy) | `vercel.json` cron, `/api/cron/catalog` |
| 12 | Clicks persisted without personal data; clicks ≠ sales | Implemented; NOT TESTED live | `dp_record_click`, `/go/[id]` |
| 13 | Real API fetch, real price comparison vs AliExpress page | BLOCKED | needs Vercel env + DB (see PROGRESS.md "Owner actions") |
| 14 | CI blocks merges on typecheck/test/build failure | Implemented; enabling "required" is an owner setting | `.github/workflows/ci.yml` |
