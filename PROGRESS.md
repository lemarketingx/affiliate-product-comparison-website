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

## 2026-11-16 (evening) · Frequency limit, separate jobs, one job at a time

### Real evidence (DB `dealpilot`, runs #5–#6, owner-triggered)
- **Run #5 (discover):** 0 calls. Every term is exhausted until its 7-day reset, so no search calls were spent.
- **Run #6 (price refresh), status `partial`:**
  - 5 calls, 20 products checked: 15 updated, 5 confirmed.
  - Profiles `full`, `no_language` and `no_currency` → 402; `country_only` was accepted.
  - The next call got `PROVIDER_ERROR_ApiCallLimit` with the provider message "Api access frequency exceeds the limit. this ban will last 1 seconds". This is a per-second frequency limit, not the daily quota.
- **Deduction:** `no_currency` (country + `tracking_id`) failed while `country_only` succeeded, so **`tracking_id` is the rejected parameter**. Every earlier ILS attempt also carried `tracking_id`, so ILS without it was never tried.
- **Side effect:** `country_only` answers in USD. 15 of the 46 published products currently show USD prices; the currency is never relabelled.
  - 9 of the 15 had no USD `salePrice` in their search snapshot, so no confirmation was possible.
  - 6 had a USD price that changed (average 3.06%).
  - All 5 confirmed products kept ILS, with a 0.12% average USD gap.

### Built
| Commit | What it does |
|---|---|
| `5c0202e` · goal 1 (rate) | `lib/aliexpress/pacer.ts`: all gateway calls in a process are spaced ≥ 1.1 s (`DEALPILOT_ALIEXPRESS_MIN_INTERVAL_MS`). A short ban (≤ 10 s, parsed from the provider's own message) is waited out once and counted in the budget. A long or unparseable ban stops the run (no guessing). Applied in discovery and in the detail profiles. |
| `5c0202e` · goal 2 (separate jobs) | `/api/cron/catalog?job=discover\|prices`, two daily Vercel crons (02:17 and 03:47 UTC) and two admin buttons. A price check spends no search calls, and an import spends no price calls. |
| `5c0202e` · goal 3 (one at a time) | Migration `20261116150000_run_lock.sql`: `dp_start_run` takes `pg_advisory_xact_lock` and refuses while another job runs (SQLSTATE DP409 → `RUN_IN_PROGRESS` → HTTP 409, with no provider call). A run stuck for more than 10 minutes is closed as abandoned. |
| `69b86be` | New first profiles `ils_no_tracking` and `usd_no_tracking`. Rejected profiles are logged (`DETAIL_PROFILE_REJECTED`) and skipped for 30 days (migration `20261116160000`), so each costs at most one call. |

### Tests
- **Unit: 109/109.** New tests cover:
  - ban parsing on the verbatim live message;
  - pacer spacing and queueing;
  - retry counted in the budget, and stopping when banned again;
  - the run #6 replay: the price refresh continues past the ban and succeeds;
  - discovery riding through a ban;
  - the database lock, sequential (refusal, then release, then abandonment);
  - profile memory;
  - the live scenario where only `tracking_id` is rejected → the ILS profile is accepted on the first call and prices stay ILS.
- **Static check only:** the lock-before-check statement order. pglite cannot run a true two-session race.
- **e2e (fixture Supabase): 11/11**, including separate jobs (a prices job leaves `discovery = null` and vice versa), with real pacing at 200 ms in the test server.
- **Real DB:**
  - Migrations `run_lock` and `detail_profile_rejections` applied, both additive.
  - Inside a rolled-back transaction: the remembered profile is `country_only`, a first start returns id 7, a second start is refused with `RUN_IN_PROGRESS / DP409`.
  - After commit: `dp_last_detail_profile` = `{profile: country_only, rejected: []}`, and no run is left running.
- Typecheck and build pass.

### Not verified (BLOCKED / NOT TESTED)
- **BLOCKED:** whether AliExpress accepts `ils_no_tracking` (unverified until the next real run). If it does, the 15 USD prices return to ILS at the next price check.
- **BLOCKED:** a real price run with pacing; it needs the owner's button or a cron.
- **NOT TESTED:**
  - a true two-session race against the real DB;
  - the crons themselves, which fire only on Production after a merge;
  - the effect of the missing `tracking_id` on detail answers. Affiliate links come from the search's `promotion_link`, not from the detail call, so links should not be affected, but this is unverified.

### Live result, run #8 (owner pressed "בדיקת מחירים עכשיו", 14:53 Israel time)
- **PASS (live):** `ils_no_tracking` was accepted on the **first** call. This confirms that `tracking_id` was the rejected parameter.
- Status `succeeded`: 2 calls (20 + 6 products), 26 updated, 0 failed, no ban, 4.8 s.
  - Pacing worked: there was no `ApiCallLimit`.
  - No search calls were made, because the jobs are now separate.
- **Price accuracy, search vs product-ID check (same currency):** 26/26 identical. Average and maximum gap are 0.00%, the SKU is the same in all 26, and the field used is `target_sale_price`.
  - So the feed data is consistent. Any remaining difference against the AliExpress page is checkout-side: app price, coupons, the variant the shopper picks, or shipping. It is not stale data.
- Published products now:
  - 31 in ILS: 26 by product-ID check, 5 confirmed;
  - 15 in USD, from run #6 (`country_only`).

  All 46 are fresh (under 48 h).
- The 15 USD products were not due (minimum 20 h between checks). Their `price_check_at` was reset (a scheduling field only; prices unchanged), so the next price check re-queries them with `ils_no_tracking`. A shekel answer then replaces the USD price.

## 2026-11-16 (evening, 2) · Run #9 and affiliate link verification
- **Run #9 (owner, 14:55, prices):** `ils_no_tracking`, 1 call, 15 updated, no errors. **All 46 published products are now priced in ILS** and fresh.
- **Stored affiliate links:** all 46 are long-form `https://s.click.aliexpress.com/s/…` promotion links. The stored product URLs carry `pdp_npi` (original price, sale price, SKU) and `affd`.
- This sandbox cannot reach AliExpress (proxy refuses `s.click.aliexpress.com` with 403), so the links cannot be verified from here. The check therefore runs server-side on Vercel, as a job.
- **Built (`8d7bfbc`):**
  - `lib/aliexpress/link-check.ts` follows the redirects of a promotion link without loading the product page. It records:
    - whether every hop stays on AliExpress;
    - whether the chain reaches the **same product id**;
    - which affiliate parameter *names* survive (`aff_fcid`, `aff_platform`, `sk`, …; values are never stored).
  - 200 pages that redirect by script or meta refresh are handled, preferring a link to the expected product. A mismatch seen only in a page body is inconclusive and never unpublishes.
  - Job `links`: third daily cron (04:23 UTC) and an admin button, 8 links per run, oldest first, re-checked every 7 days. It shares the one-job lock.
  - Migration `20261116170000_link_checks.sql`, **applied to the real DB**: link status columns and the `link_check` run kind. `wrong_product` and `not_aliexpress` unpublish automatically (logged); `broken` is only recorded.
  - The admin panel "קישורי שותפים" shows checked, ok, with affiliate params, unverified, and unpublished-by-link.
- **Tests:**
  - unit 112/112 (classification, page redirects, inconclusive handling, DB recording and unpublishing, lock);
  - e2e 12/12 (`job=links` through the real server with fixture redirects: 8 checked, ≥ 7 ok, with affiliate params);
  - build OK.
  - Real DB after the migration: `dp_link_summary` = 46 published, 0 checked; 8 due.
- **BLOCKED: the first live link check.** It needs the owner's button, "בדיקת קישורי שותפים עכשיו". Note that following a promotion link may count as a click in the AliExpress portal; only 8 links per run are checked.

### Live result, run #10 (owner, 15:08, link check)
- **PASS (live):** 8/8 links OK, status `succeeded`, 6.7 s, no errors, 0 unpublished.
  - Each link reached its product in **1 redirect** (`s.click.aliexpress.com` → `www.aliexpress.com/item/<id>.html`).
  - The product id **matched in all 8**.
  - All 8 carried the affiliate parameters `aff_fcid`, `aff_fsk`, `aff_platform`, `aff_trace_key`, `sk`, `terminal_id`, `afSmartRedirect` and `pdp_npi`.
- **Not provable from the links:** that the tracking id inside them is the owner's own. The parameter values are opaque. That needs the AliExpress portal's click report.
- **Simple owner check:** today's clicks in the portal should include these 8 link checks plus the `/go` click recorded earlier.

## 2026-11-16 · Pre-merge gates (owner chose "finish gates, then merge")
### Gate 1: security review of the SQL service-role functions (PASS, real DB)
- **Functions:** all 19 `dp_*` functions run as SECURITY INVOKER with a fixed `search_path=public`. anon and authenticated have no EXECUTE; service_role has.
- **Tables:** all 6 `dp_*` tables have RLS on and no anon or authenticated privileges.
- **Supabase advisors:** only INFO `rls_enabled_no_policy`, which is intended.
- **Code:**
  - No secret is referenced with `NEXT_PUBLIC_`.
  - The service key and secrets are read only in server-only modules, and no client component imports them.
  - No DB or provider error text reaches responses; only short codes do.
  - `rpc()` accepts only `dp_[a-z_]+` names.
  - The link checker fetches only `https` AliExpress hosts, checked before every hop, and reads at most 64 KB of a 200 body.
  - Cron uses a timing-safe Bearer check and fails closed.
  - Admin APIs require an admin session, same-origin and a rate limit.

### Gate 2: e2e triage (35 → 36 of 38 pass)
- **Before:** the 15 failures were identical on `main`. Cause: the brand-first redesign (`fdcf574`, `a425f8f`, `86f72ca`, `63f0b22`) changed the markup, copy and features without updating the e2e tests.
- **Real defect fixed:** the homepage had **no `<h1>`**. A visually hidden h1 was added, so the design is unchanged.
- **Stale tests updated, with the same strictness:**
  - hero class, navigation, category and search labels;
  - product copy, still checked as "not verified";
  - the buy CTA now goes through `/go`;
  - a strict-mode bug in premium-home (every card is now checked);
  - a wait for the cold catalog build (async by design);
  - the autopilot test starts at `/autopilot`.
- **Still failing, owner decision (not skipped or disabled):**
  - `preflight.spec:123`, "מה כנראה לא בקופסה": the feature was removed from the product page in `86f72ca`. Restore it, or approve deleting the test.
  - `populated-flow.spec`: the fixture and assertions predate the brand-first catalog (an unbranded product, an "אופנה ואביזרים" category). Needs a rewrite.
- **Result:** unit 112/112, e2e 36/38, typecheck and build pass.

### Gate 3: CI and Production
- CI (`verify`: typecheck, unit, build) runs on every push to PR #20.
- Production env vars (DB, `CRON_SECRET`, AliExpress) cannot be read from here (Vercel 403). Without them, Production keeps the legacy live-cache catalog and the crons answer 503 `STORE_NOT_CONFIGURED`, so the merge is safe either way.

## 2026-11-16 · Milestone 2 started: brand and one storefront
- The branch was restarted from `main` (`bae2e6f`) after PR #20 merged.
- **Baseline:**
  - Screenshots of the incumbent (`docs/screenshots/design-lab/before-*`) show the home page navy/gold and the product page boarding-pass cream, two different languages.
  - The header search button is an empty circle.
  - Speed baseline recorded in `SPEC.md`.
- **Name:** `docs/BRAND-NAMING.md`, with domains checked live (Vercel registry) and conflicts searched.
  - DealPilot: all main domains are taken, and a same-category "DealPilot" coupon app exists (LoudCrowd).
  - "שקוף": rejected, because Shakuf is an Israeli news nonprofit.
  - **Recommended: תכל'ס (Tachles).** `tachles.shop`, `.deals` and `.io` are free. `.co.il` and the trademark register are NOT CHECKED.
  - Nothing renamed on the site; awaiting owner approval.
- **Symbol:** a tag with a "bottom line" bar and a check, not a cart. It replaces `public/favicon.svg` (name-neutral). Lockups for the proposed name, light and dark, are in `public/brand/`.
- **Design lab:** `/admin/design-lab` renders three directions on the same slice with real catalog rows; no horizontal overflow at 390 and 1440. Scored in `docs/DESIGN-DIRECTIONS.md`: **A "השורה התחתונה" chosen (18/20).**
- **Inputs:** PRs #3 and #16 were read as inputs, not merged. Both target an old base branch.
- **Next:** token layer, then migrate in revenue order (product card → product page → home → listings → states), with e2e updated in the same commits.

### Milestone 2, increment 1: product card and product page in direction A
- **Built:**
  - `app/bottomline.css`: the token layer (`--bl-*`), plus card and product-page styles.
  - The card (`app/product-card.tsx`) loses the boarding-pass elements (flight code, barcode, perforation). It shows the brand, a 2-line title, reported sales, the price as a receipt line in tabular mono, "המחיר נבדק לפני N שעות" (`freshnessLabel`, unit-tested), the tax badge and an honest verification chip. The whole card is one link.
  - Product page: one visible h1, and a receipt block covering the price with its source and check time, import tax, shipping ("מוצג בקופה") and "השורה התחתונה", which links to the existing true-cost calculator.
  - The CTA goes through `/go`. A mobile sticky buy bar was added. The "חלופות מאותה קטגוריה" section replaces the airport copy.
  - `lib/brand.ts` centralises the brand name. It is still DealPilot, pending approval.
- **Bugs found and fixed during QA:**
  - **The CTA text was invisible.** The legacy `.fp a { color: inherit }` beat `.bl-cta`; links now use `a.bl-cta` specificity.
  - **Narrow cards clipped the title and price** at 390 px (two columns). Fixed with a `minmax(0, 1fr)` track and a container query that stacks the price.
  - **A QA pitfall, recorded so it isn't repeated:** a stale `next-server` process kept serving HTML from an old build, which made the page look unstyled. Kill `next-server` too, not only `next start`.
- **Checks:**
  - No horizontal overflow and exactly one h1 at 320, 375, 390, 768, 1024, 1440 and 1920 on `/deals` and the product page.
  - The CTA text computes to white.
  - No card child sits outside its card at 320, 390 or 1440.
  - Unit 113/113. e2e 36/38: the 2 owner-decision tests remain failing; selectors moved to roles and labels.
- **Not done yet:**
  - The header and footer shell still use the old cream/airport language ("מגדל פיקוח", "שעון ישראל").
  - Home, listings, category/brand pages and the loading/error/404 states are not migrated.
  - The OG image is missing.

## 2026-11-16 · Phase 2 continued: owner decisions, full storefront in direction A
### Owner decisions applied
1. **תכל'ס is not approved:** the active Israeli site "תאכלס" (tachlis.co.il) creates a confusion risk. Name research round 2 is in `docs/BRAND-NAMING.md`: five names scored, with a live domain check; Israeli trademarks are **NOT CHECKED** (the ILPO host is unreachable from here and gov.il returns 403). Recommendation: **מחיר אמת**, backup **סופית**. The live name stays DealPilot; it lives only in `lib/brand.ts`.
2. **"מה כנראה לא בקופסה"** stays removed until verified product data exists. The browser test that asserted it was replaced; a comment in `tests/e2e/preflight.spec.ts` records the decision, and the test now asserts that the heading is absent.
3. **populated-flow rewritten** for branded products: card, brand link, ₪ price only, header search, product receipt, CTA `rel=sponsored`, `/go` ignores `?url=`, brand page, and a 375 px buy bar.

### Built
- Shell: symbol, swappable wordmark, disclosure top line, search with a visible "חיפוש" button (it used to be an empty circle), nav and mobile menu, footer. All airport copy removed.
- Home: h1 with the promise, real catalog facts (count of prices checked within 48 h, DB only), the official-campaign carousel restyled, brand logos, category banners, how-it-works, and best sellers.
- Catalog, search, category and brand lists; category tiles; loading skeleton (respects reduced motion); error page; 404 with search.
- `freshnessLabel()` in `price-view.ts` (unit-tested).

### Tests (local, fixtures)
- typecheck OK · unit **113/113** · build OK · e2e **38/38**.
- QA: 8 pages × 7 widths (320–1920): no horizontal scroll, exactly one h1, no broken images, minimum price font 19 px.
- axe-core 4.10.3 WCAG 2.1 A/AA: **0 violations** on 8 pages at 390 and 1440. Fixed along the way:
  - invisible "סינון" button text (legacy `!important`)
  - pager contrast
  - five brand-logo colours below 4.5:1
- Speed: see `SPEC.md` (no regression; mobile deals improved from 724 to 432 ms).
- Screenshots: `docs/screenshots/phase2/`.

### Findings
- Test flake root cause: during streaming, Next keeps content in a hidden wrapper for about 30 ms, so role queries could see 0 links. Tests now wait for the first card to be visible.
- The legacy no-DB `/go` path waits up to 15 s and answers 503 while a cold catalog builds. Production reads the database, so it is unaffected; this is logged in TASKS.
- On mobile, the catalog's policy notice and tax note push the first products below the fold; logged in TASKS.

### Not done / blocked
- Production unchanged; nothing merged to `main`.
- `/admin/design-lab` must be removed before any merge.
- The OG image waits for the approved name.
- Product images from the AliExpress CDN are blocked in this sandbox, so image rendering was tested with fixture images. Live images: NOT TESTED here.

## 2026-11-17 · Launch readiness round (owner: no merge, no Production change)
Full report: `docs/LAUNCH-READINESS.md`. Name research: `docs/BRAND-NAMING.md` (round 3).

### Decisions and corrections
- **מחיר אמת withdrawn.** A same-category "מחיר אמת" deals site exists; round 2's search method missed it. Round 3 searches each name with category words, in Hebrew and transliteration.
- **Round 2 `.co.il` results were wrong.** The Vercel registry tool answers "taken" even for a random `.co.il`. Every `.co.il` is now NOT CHECKED.
- **Price job run #12 made 0 calls, and that was correct.** Prices were 16 h old and the minimum age is 20 h. An earlier "due" count of mine used the wrong condition.
- **Discovery found 0 new products** because all 24 terms are exhausted (sales-sorted results, threshold 5,000). The rule is correct; growth needs new terms (owner decision). Rules were not relaxed.

### Live checks (Production, read-only except one test click)
- Environment network: added `affiliate-product-comparison-websit.vercel.app` and `ae-pic-a1.aliexpress-media.com` (owner-approved prompt).
- Images: 46/46 originals and 46/46 thumbnails HTTP 200.
- Purchase path: 307 to the stored link, visitor `url=` ignored. One test click was recorded (`dp_click_events` id 2, source `other`, 2026-11-17 07:24:40 UTC).

### Code
- Display rules: parts and multi-brand stores no longer count as brand proof; seller sale banners are stripped; "car" needs a car word. Applied at read time and at ingest, with unit tests on real rows.
- Image fallback that also catches failures before hydration. The thumbnail is also used for the `aliexpress-media.com` host.
- Mobile catalog compacted; e2e checks the first screen at 4 sizes.
- `font-display: optional` and a body-font preload (CLS was up to 0.23 on real data, now ≤ 0.042).
- Empty-category state; `/admin/design-lab` removed.

### Tests (final build)
typecheck OK · unit **120/120** · build OK · e2e **43/43** (run right after a real-data local server, which proves the cache fix) · axe 0 violations on real data (5 pages × 2 viewports) · 120/120 card images loaded as thumbnails.

### Follow-up corrections (same day)
- The "intermittent" store e2e failure was cache leakage between local servers: the store cache key lacked `DEALPILOT_CACHE_NAMESPACE`. Reproduced on demand, then fixed.
- Mobile LCP: locally FCP = LCP; the local server is uncompressed HTTP/1.1, Production is HTTP/2 + brotli, so the numbers are not comparable. A Preview measurement is needed (LAUNCH-READINESS D12).
- Names: re-ran the "מחיר אמת"-style query (exact phrase + "השוואת מחירים", extended) on each candidate. "תחתית" is also a product type on Zap and CHP; "שורלי" has a possible insurance-comparison mention. Lead candidate is now **סופית**, with no strong winner.
- Brand rule: sister brands count once; promo words match whole words only.

## 2026-11-17 (afternoon) · Business readiness for a trial launch
Report: `docs/TRIAL-READINESS.md`. Production actions: `docs/CATALOG-ACTIONS.md`. Expansion data: `docs/CATALOG-EXPANSION.md`. Names: `docs/BRAND-NAMING.md` (round 4).

- **Production data (owner-requested):**
  - Product 1005009849771017 unpublished via `dp_set_unpublished` after verifying it is a multi-brand parts listing; event logged.
  - All 46 affiliate links checked with the job's code and recorded as run 14: 46/46 ok, same product ID.
  - An unintended test click (row 3) came from a stale-cache redirect; the cause is documented.
- **Branch:**
  - Empty categories hidden everywhere.
  - Final-price note on the product page.
  - Toocki brand and 12 model-level terms, chosen from provider data (`orders`, `commission_rate`, brand-run stores).
  - Tests updated for the new behaviour: the empty-catalog test now expects no category tabs; the warm-up wait is longer for the no-DB path; the store test scans for a detail-checked product.
- **Tests:** unit 121/121 · e2e 44/44 · typecheck and build OK.
- **Blocked:**
  - Preview performance: no Preview link yet.
  - `.co.il` and trademarks: ISOC and TMview block automated access.

## 2026-11-17 (evening) · Owner report: site price ≠ AliExpress price
**Diagnosis (read-only, live DB and Production):**
- The site shows exactly what the database holds: 18/18 products match.
- After the owner lowered the threshold to 500 (main 78aab2e), 315 of 360 products went live with a price from the previous day's search, about 26 h old, never re-checked.
- Prices moved sharply in 24 h. Among the 45 checked products the average change was 4.9% and the maximum 9.3%. About half changed by about 9%, which looks like a promotion step rather than drift.
- At the same moment, the search price and the product-ID price were identical (46/46 same SKU, 0% difference), so the cause is **age, not source**.
- AliExpress product pages block automated access (bot check), so the AliExpress-side price was **not observed** here. Match: NOT VERIFIED.

**Fix (branch, needs merge):**
- Re-check minimum age 20 h → 2 h. Before, a price checked at 10:32 was skipped by the next day's run.
- Display limit 48 h → 30 h.
- Above 12 h, the card and product page say the price may have changed.
- A 4-hourly GitHub Actions schedule runs the price and link jobs (needs secret `DEALPILOT_CRON_SECRET`).
- Link checks per run 8 → 25 (315 links are unchecked).
- Tests: unit 123/123; e2e 44/44 (link-count and 500-threshold expectations updated).

**Owner actions:**
1. Run the price check now from `/admin/catalog` (it covers all 360).
2. Add the secret.
3. Merge.
4. Send one concrete example (product, both prices, app or web, variant).

## 2026-11-18 · Merge #27 and live speed check (owner approved)
- **Verified live first:**
  - The price-fix work merged by ChatGPT (#23) runs: the 4-hourly workflow succeeds, so the secret is set.
  - The oldest price was 4.4 h old, none older than 12 h.
  - 520 products published after the nightly discovery.
  - Links: 145 ok, 375 waiting, 0 bad.
- **PR #27:** self-hosted logos for 21 brands, 7 data-backed brands, and product-level terms. CI was green and the PR merged cleanly at 09:12 UTC. Production now serves `/brands/*.svg|png`.
- **Performance on the real deployments** (real images; Pixel 7 profile with 4× CPU slowdown, 1.6 Mbps and 150 ms RTT, plus desktop; median of 3 runs per page):

| Page | Mobile LCP: Preview (logos) | Production before | Production after merge | Desktop LCP: Production after |
|---|---|---|---|---|
| Home | 1,844 ms | 1,696 | 1,680 | 792 |
| Deals | 1,776 | 1,592 | 1,560 | 708 |
| Category | 1,824 | 1,536 | 1,752 | 680 |
| Search | 1,736 | 1,560 | 1,664 | 664 |
| Product | 1,472 | 1,504 | 1,496 | 624 |

  - Before and after on Production differ by −120 to +216 ms in both directions, which is measurement noise. The logos did not slow the site.
  - On every page and run: axe WCAG 2.1 AA 0 violations, CLS ≤ 0.033, 0 broken images.
  - Mobile LCP of about 1.5–1.8 s is bound by first paint (FCP = LCP) under the throttled profile. This closes the open "Preview performance" item.

## 2026-11-18 · The bottom line: estimated cost to Israel (owner approved)
- `estimateIsraelTotal()` in `lib/preflight/tax-estimate.ts` (pure, unit-tested) computes the supplier price plus the import VAT on the item, using the verified tax rules (`IMPORT_TAX`) and the Bank of Israel rate.
  - It is always labelled "before shipping": the affiliate API returns no shipping cost.
  - Above the $75 exemption it is a lower bound ("לפחות"), because VAT also applies to shipping and some products carry purchase tax.
  - With no rate, no price or unverified tax rules, it returns no number.
- **Product page:** the "השורה התחתונה" row in the price box shows the number with a short explanation and a link to the calculator to add shipping.
- **Card:** a "לישראל: לפחות ₪X לפני משלוח" line, only when VAT applies. Exempt products already show "פטור ממסים".
- **Tests:** unit 131/131; e2e 45/45, including a new test for the card line and the receipt row.

## 2026-11-18 · Motion: seller videos, moving strip, Ken Burns, scroll reveal (owner: "כן להכל")
**Product page: seller videos**
- Source: the provider field `product_video_url`, which the 2026-11-14 probe lists in both product.query and productdetail.get. No real value has been observed yet.
- `normalize.ts` accepts https only, on AliExpress video hosts: `*.alicdn.com`, `*.aliexpress-media.com`, `video.aliexpress.com`, `cloud.video.taobao.com`. For a rejected URL, only its hostname is kept, for diagnostics.
- Migration `20261118000000_product_video.sql` (additive): `dp_products.video_url`; `dp_set_videos` (service role only, https only, never clears a stored video); `dp_catalog` returns the column. `dp_ingest` and `dp_record_prices` are **not** replaced.
  - **Applied to the live project** `kjkkuhqebtyfohhvwnfs` on 2026-11-18, before the merge. Before applying, the live `dp_catalog` matched the repository text.
  - After applying: 520 published rows, `video_url` key present, `anon` cannot call either function.
- Discovery and the 4-hourly price check both store videos. Job stats gain `videos: {seen, accepted, stored, writeFailed, rejectedHosts}`. **The first live run shows whether the host allowlist is right.**
  - A failed video write never fails a job (tested).
- Gallery: the `<video>` element is mounted only after a click, so there is no request on page load (e2e). It is labelled "סרטון של המוכר, מתוך AliExpress". On error the gallery drops it and shows the image.

**Home page**
- Moving strip: logos of brands with listed products, plus the 12 best sellers labelled "מכירות מדווחות לפי הספק".
  - Pause button, plus a pause on hover or focus (WCAG 2.2.2).
  - The loop copy and the repeated filler items are `aria-hidden`/`inert` and not focusable.
  - Reduced motion: no motion, and the strip scrolls.
  - Checked: no gap at 0–99% of the loop at 390 and 1920 px.
- Ken Burns: a finite slow zoom on the carousel images, per slide.
- Scroll reveal: transform only, below the fold, inside `@supports (animation-timeline: view())`.

**Tests:** unit 136/136 · e2e 48/48 · typecheck and build OK.
- Local real-data server, 10 page × mode runs: axe 0, CLS ≤ 0.04, no overflow, 0 broken images. The home LCP element is still the H1.

**NOT VERIFIED**
- A real seller video: no real `product_video_url` value has been seen. This will be known after the first price run on the merged code (stats `videos`).
- Axe with the video player open was not run on real data (no real video).
- Production before (main, live, same script): mobile home LCP 3.1 s, desktop 0.8 s, axe 0. The Preview comparison follows.
