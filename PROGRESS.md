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
- New `tests/e2e/catalog-store-flow.spec.ts` (7/7 PASS) runs on an isolated server on port 3105. It uses the fixture AliExpress provider and a fixture Supabase endpoint (`tests/fixtures/store.mjs`), which is pglite running the **real migration**. That executes the unmodified `server.ts` RPC contract, the cron job, the database-backed storefront and the admin page. It verifies:
  - a seeded product whose price is 5 days old is listed with **no** price;
  - cron with a wrong secret returns 401;
  - cron with the right secret imports: 30 calls, 1,355 inserted, 871 published, duplicates across terms collapsed, and 199 prices re-checked by product ID;
  - a second run shows inserted + updated = unique, so nothing is inserted twice;
  - the storefront reads from the database and shows the detail price with its source, time and SKU;
  - `/go` returns a 307 immediately and the click is stored;
  - the admin dashboard shows totals, the 4% search-vs-detail gaps with explanations, runs, warnings and 1 click, with no horizontal overflow at 320, 768 and 1440 (screenshots under `test-results/`, not committed);
  - after an admin unpublish, `/go` returns 404.
- Observed during that run: a second import inside the same hour stops early on the in-process provider-call guard (`PROVIDER_QUOTA_GUARD`, limit = budget + 10 per hour). The run is marked partial and the cause is logged. This is deliberate protection of the AliExpress quota. A manual "run now" shortly after the cron run will therefore do little, and the dashboard says why.
- **Pre-existing e2e failures.** On this branch the full e2e run gives 21 passed and 15 failed. On untouched `main` @ 2ef9ffb, the same command gives 11 passed and the **identical set of 15 failures** (diffed), so this work causes no regression. Cause not investigated. They are queued in TASKS.md and were not modified.
- Everything above is fixture evidence. It proves the code paths, not the live AliExpress or Supabase integration.

### Owner actions needed (minimum)
1. **Database.** Approve a dedicated Supabase project for DealPilot. It would be the third project in the free org, which allows 2 active free projects. Alternatively, choose to delete or keep paused the inactive `kesher-mortgage-partners`; this needs your decision.
2. **In Vercel → affiliate-product-comparison-website → Settings → Environment Variables (Preview first):**
   - `DEALPILOT_SUPABASE_URL` and `DEALPILOT_SUPABASE_SERVICE_ROLE_KEY` from the new project (Project Settings → API). Server-only; never `NEXT_PUBLIC_`.
   - `CRON_SECRET`: a random value of 32 or more characters.
   - Keep the existing `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` and `ALIEXPRESS_TRACKING_ID`.
3. Apply `supabase/migrations/20261116000000_dealpilot_catalog_store.sql` to the new project. Paste it into the SQL editor, or tell Claude the project exists and it will apply the migration and run the Supabase security advisors.
4. Redeploy. Then open `/admin/catalog` and press "הפעלת ייבוא ובדיקת מחירים עכשיו".
   - Vercel Cron fires **only on the production deployment**. The daily job therefore will not run until this branch is merged to `main` and the variables are also set for **Production**.
   - The older setup note put the AliExpress keys in Preview only. Until that changes, the cron is configured but not running.
5. Optional: in GitHub branch protection for `main`, mark the CI check as required.

### Not done / blocked
- **BLOCKED:**
  - a real import against AliExpress;
  - a rerun without duplicates on the real DB;
  - a price comparison against 20 real AliExpress pages;
  - cron execution after deploy.

  All of these wait on the env and database above.
- **NOT TESTED:**
  - The CI workflow has never run. It triggers on pull requests and on pushes to `main`, and no PR was opened.
  - The Vercel deployment state of this branch: the Vercel connector returns 403 for this project.
  - The admin page with real, non-fixture data.
  - Conversion and commission import, which waits on orders-API permission.
- The live site behaves exactly as before until the owner actions above are done, because without the database variables the code takes the old path.
- Creating the Supabase project from this session was denied by the permission system and was not retried.

## 2026-11-16 (afternoon) · Price refresh fails with `PROVIDER_RESULT_402_INVALID_PARAMETER`

### State found (real DB `dealpilot`, `kjkkuhqebtyfohhvwnfs`)
- Owner commits on the branch since the morning session:
  - `63f0b22`: buy button goes through `/go`.
  - `a3b226a`: a configured store is authoritative; no fallback to the old cache.
  - `98bdf8f`: detail call uses `target_currency=USD` instead of ILS.
- Runs:
  - #1 discover: 32 calls, 46 published.
  - #2 price refresh at 12:30 (Israel time): 3/3 calls failed with 402.
  - #3 discover: 15 updated.
  - #4 price refresh at 12:40: 3/3 calls failed with 402.
- The USD deployment (`98bdf8f`) completed at 12:36, so run #4 most likely ran with USD and still failed. The currency was therefore probably not the only rejected parameter. This cannot be proven from here: the Vercel connector returns 403 for this project, so which deployment served run #4 is not visible.
- The provider message was discarded, so the rejected parameter was unknown.
- Products: 1,715 total, 46 published.
  - All prices come from the search (ILS). No product has a detail-checked price.
  - All 46 published search snapshots have a SKU, and 28 also keep the USD `salePrice`.

### Diagnosis
- The live probe on 2026-11-14 succeeded with `product_ids` (one id) and `country=IL` **only**.
- The failing calls added `target_currency`, `target_language=HE` and `tracking_id`, plus 20 comma-separated ids.
- Any of those could be the rejected parameter. AliExpress's 402 text names it, but the code threw the text away.

### Fix (`67c1cb4`)
1. `AffiliateError.detail` keeps the sanitised provider message (`safeProviderMessage`, with the app key, secret and tracking id redacted). It is written to `dp_import_events` only, never shown to visitors.
2. `lib/aliexpress/detail-profiles.ts` defines five parameter profiles: `full` → `no_language` → `no_currency` → `country_only` → `probe_single`. The last one is exactly the request that succeeded on 14-Nov.
   - On `INVALID_PARAMETER` the job steps down one profile.
   - The accepted profile is reused for the rest of the run and logged as `DETAIL_PROFILE_ACCEPTED`.
   - Every attempt counts against the call budget.
   - Ids that a smaller batch cannot include go back to the queue; they are not counted as missing.
3. Migration `20261116130000_detail_price_currency.sql` was **applied to the real DB**. It is additive: one constraint widened, two functions replaced.
   - A USD detail quote never overwrites an ILS price as ILS.
   - If the USD price is unchanged since the search quote (same SKU), the ILS quote is *confirmed* as current (`price_method='confirmed'`).
   - If the USD price changed, the fresh USD price is shown, labelled USD.
   - The gap view compares only in one currency.
4. The product page and the admin table label confirmed and non-comparable prices.

### Tests
- Unit: 100/100, including 4 new tests. They cover:
  - 402 → sanitised message;
  - profile step-down, reuse, budget, and deferral of single-id batches;
  - logging of the provider message and accepted profile;
  - USD confirm / replace / SKU mismatch / never relabelling the currency.
- Real DB, inside a transaction that was rolled back (verified: 0 detail snapshots afterwards), on a real published product:
  - its own USD price → `confirmed`, still 102.90 ILS;
  - USD +10% → 34.39 **USD**, method `detail`.
- Supabase security advisors: only INFO `rls_enabled_no_policy`, which is intended (service role only).
- e2e on the fixture Supabase: catalog-store flow 7/7 and catalog-store 3/3. The fixture now answers ILS with a 402, as seen live.
- Typecheck and build pass.
- Vercel Preview for `67c1cb4` reports "Deployment has completed" (GitHub status). CI `verify` was in progress when this was written.

### Still BLOCKED: live verification
- No AliExpress credentials exist in this session, and the admin button needs GitHub OAuth. A live price refresh therefore cannot be triggered from here.
- **Owner action:** on the PR #20 Preview open `/admin/catalog` and press "הפעלת ייבוא ובדיקת מחירים עכשיו" once. The events table will then show either `DETAIL_PROFILE_ACCEPTED · <profile>` or the provider's own 402 text. Claude can read the result from the database.
