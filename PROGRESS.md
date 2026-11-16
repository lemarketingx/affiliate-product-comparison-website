# PROGRESS — decisions, changes, tests, blockers

## 2026-11-16 · Milestone 1: persistent catalog, import pipeline, prices
Branch `claude/sharp-meitner-w6pgaa` (from `main` @ 2ef9ffb).

### Inspection findings
- Baseline on `main`: typecheck OK, 81/81 unit tests pass.
- Open PRs not touched: #3 (design/dealpilot-preflight), #16 (brands-originals), #19 (price-transparency copy plus a per-page-view `productdetail.get` call). #19 is based on a diverged branch (it uses `originalPrice`/`pickOriginalPrice`, which `main` lacks) and its Vercel status failed ("Deployment rate limited", Hobby limit of 100 deploys/day). This milestone implements the price check independently. It runs as a scheduled, budgeted batch job rather than on every view, because the 14-Nov probe recorded `ApiCallLimit` on product detail. #19's `ship_to_country` for detail is replaced by `country=IL`, the parameter that succeeded live.
- Vercel project for this repo: `affiliate-product-comparison-website` (`prj_6SSPYDSBhR6Ng4Tr8vzi7YtNdUJV`, team lemarketingxs-projects, Hobby). The Vercel connector in this session gets **403** on its deployments and env vars, so env names and deployment status cannot be inspected from here. The only listable Vercel project, `mortgai`, belongs to another repo and a live site; it was deliberately left untouched.
- Supabase org `lemarketingx's Org` (free plan) holds only the mortgage projects `mortgai` (active) and `kesher-mortgage-partners` (inactive). No dedicated DealPilot database existed, and `supabase/project.json` points at the mortgage project. Neither was touched.
- No AliExpress credentials exist in this environment. The API signs request parameters with the app secret, so a proxy-injected header cannot stand in for them, and no live provider call was possible.
- Existing live evidence: `docs/aliexpress-quality-probe-2026-11-14.json`.
  - Search rows return `sale_price`, `target_sale_price`, `app_sale_price`, `target_app_sale_price`, `original_price`, `target_original_price`, `discount`, `sku_id` and `tax_rate`.
  - Product detail with `country=IL` succeeded.
  - The review endpoint returned `InsufficientPermission`.

### Price-gap analysis
This is what the code shows. It has not yet been confirmed against live AliExpress pages.

| Cause | Evidence | Handling now |
|---|---|---|
| Shown price came from a keyword-search row cached ≥ 6 h, shown with no age | `catalog.ts` cache, `revalidate: 21600` | Every observation is stored with its time. A price older than 48 h is withheld. Detail checks run daily by product ID. |
| Several prices per row: web `target_sale_price` vs app `target_app_sale_price` (often lower), plus original/discount | probe field list | All raw fields are stored per snapshot. The dashboard flags "app price differs" and "provider discount". |
| The price belongs to one `sku_id`, while the affiliate link opens the product on whichever variant AliExpress selects | `sku_id` in rows | The SKU is stored and shown. Search and detail SKUs are compared, and a change is flagged. |
| ILS is AliExpress's own conversion | `target_*` vs `sale_price` USD | The implied rate is compared with the Bank of Israel rate; deviation over 5% is flagged. |
| Personal coupons, new-user prices and shipping are not in the affiliate API | API scope | Stated on the product page. Never invented. |

### Built
- `supabase/migrations/20261116000000_dealpilot_catalog_store.sql`: products, price snapshots, runs, events, term cursors and clicks. RLS is on, and only the service role may execute the `dp_*` functions.
- `lib/aliexpress/normalize.ts`: the pure normaliser, now also used for productdetail.get. It records the raw price fields and which field was used.
- `lib/catalog-store/pipeline.ts`:
  - discovery has budgets, a deadline, a page-size fallback, a quota stop, a resumable cursor, logging, and failed or crashed runs recorded as failed;
  - price refresh works in batches of 20 and automatically unpublishes after 3 consecutive misses.
- `lib/catalog-store/price-view.ts`: the display policy and gap diagnostics.
- `lib/catalog-store/server.ts`:
  - Supabase RPC adapter;
  - a 5-minute cached catalog read, invalidated after every job;
  - the job runner, click logging and dashboard.
- `getCatalog()` prefers the database and falls back to the live cache. The product page shows the price source and age.
- `GET /api/cron/catalog`: a daily Vercel Cron at 02:17 UTC, protected by a `CRON_SECRET` bearer and failing closed.
- `/admin/catalog` with `POST /api/admin/catalog`: run now, unpublish, republish, plus the full dashboard.
- `/go/[id]` clicks are persisted with product, source and time only.
- `.github/workflows/ci.yml` runs typecheck, tests and build.
- Docs: `PRODUCT-VISION.md`, `CLAUDE.md`, `SPEC.md`, `TASKS.md`, this file.

### Tests run
- `tests/catalog-store.test.mjs` contains 12 tests. They run the real migration in pglite (PostgreSQL in WASM) and use raw-shaped TEST FIXTURE payloads. They cover:
  - dedupe across runs and terms;
  - new-versus-updated counting;
  - cursor advance, exhaustion and reset;
  - failure, quota and crash handling;
  - page-size fallback;
  - price history and gap rows;
  - automatic unpublishing;
  - manual unpublish persistence;
  - role isolation;
  - constraints and the stale-price policy.
- Mutation check: breaking the "already published" logic in `dp_ingest` makes test 2 fail, so the test is not vacuous.
- Full unit suite: 93/93. `npm run typecheck` passes and `npm run build` passes.
- Playwright (preinstalled Chromium): new `tests/e2e/catalog-store.spec.ts`, 3/3 PASS.
  - The cron endpoint returns 401 with no `CRON_SECRET` and with a forged bearer.
  - The admin API returns 401 for anonymous callers.
  - `/admin/catalog` renders at 320, 375 and 1440 with no horizontal scroll and an honest "not configured" state.
- **Pre-existing e2e failures.** The full e2e run on this branch gives 14 passed, 15 failed. The same command on untouched `main` @ 2ef9ffb gives 11 passed and the **same 15 failed**, so this work causes no regression. These tests went stale when PR #15's homepage redesign merged (banners, dealpilot, catalog report, populated flow, preflight, premium-home). They are queued in TASKS.md and were not modified here.

### Owner actions needed (minimum)
1. **Database.** Approve a dedicated Supabase project for DealPilot. It would be the third project in the free org, which allows 2 active free projects. Alternatively, choose to delete or keep paused the inactive `kesher-mortgage-partners`; this needs your decision.
2. **In Vercel → affiliate-product-comparison-website → Settings → Environment Variables (Preview first):**
   - `DEALPILOT_SUPABASE_URL` and `DEALPILOT_SUPABASE_SERVICE_ROLE_KEY` from the new project (Project Settings → API). Server-only; never `NEXT_PUBLIC_`.
   - `CRON_SECRET`: a random value of 32 or more characters.
   - Keep the existing `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` and `ALIEXPRESS_TRACKING_ID`.
3. Redeploy. Then open `/admin/catalog` and press "הפעלת ייבוא ובדיקת מחירים עכשיו". Vercel Cron runs only on production deployments, so on Preview use the button.
4. Optional: in GitHub branch protection for `main`, mark the CI check as required.

### Not done / blocked
- **BLOCKED:**
  - a real import against AliExpress;
  - a rerun without duplicates on the real DB;
  - a price comparison against 20 real AliExpress pages;
  - cron execution after deploy.

  All of these wait on the env and database above.
- **NOT TESTED:**
  - `/admin/catalog` in a browser with real data;
  - Playwright e2e of the new admin page;
  - conversion and commission import, which waits on orders-API permission.
