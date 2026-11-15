# DealPilot click tracking: stage 1

## Current code
- `/go/{productId}?source=catalog`: safe product-ID redirect to a promotion URL returned by AliExpress, from the cached server catalog. Does not accept destination URLs from visitors.
- `lib/dealpilot/tracking.ts`: optional server-only click logging, without IP/cookies/user-agent/fingerprints.
- `POST /api/dealpilot/stats`: administrator-token-protected aggregate click counts.
- The control center contains a **מדידת קליקים** card.
- Clicks, purchases, commissions, CTR and profits are **not** automatically equivalent. Only click events can be counted at this stage.

## Database setup, not yet executed
**Create a NEW, dedicated Supabase project for DealPilot.** Do not reuse the original mortgage-referrals database. In its SQL editor, review and run `supabase/dealpilot-clicks.sql`.

Set these extra variables for **Preview** in Vercel:
- `DEALPILOT_SUPABASE_URL`: the new project's HTTPS Supabase URL (not the mortgage project).
- `DEALPILOT_SUPABASE_SERVICE_ROLE_KEY`: the new project's server-only service role secret (never `NEXT_PUBLIC_`). Store only in Vercel; never paste it into chat or GitHub.

Redeploy the DealPilot Preview **after** setting variables. Without the database, /go redirects still work, but click counts are not persisted and the stats card will truthfully say tracking is not configured.

## Validation
1. Open the latest green branch Preview.
2. On the catalog, click a product with a *promotion link* supplied by AliExpress. Ensure the destination is actually AliExpress.
3. On the DealPilot control center, enter `DEALPILOT_ADMIN_TOKEN` into **מדידת קליקים**, and click **הצג נתונים**.
4. Confirm source `catalog` increments only when the dedicated database is connected.
5. Cross-check affiliate click reporting with AliExpress portals; event counts can differ because of deduplication, ad blockers, source attribution and provider-side validation.
6. No customer/order attribution, actual purchases or payable commissions are recorded. Build that only after a verified affiliate transaction report is available.

## Production gates
- Dedicated database + SQL migration; retention policy and anti-abuse limits for bot clicks.
- Admin authentication (replace shared diagnostic token), error monitoring and abuse throttling.
- Full legacy mortgage route and database isolation, privacy/legal disclosures.
- Security audit of the 5 previously reported dependency vulnerabilities.
- Use verified tracked promotion URLs with an approved tracking ID; verify transactions/commissions before any mass publishing.
- Do not merge into main until the rollout is ready and the owner has reviewed the Preview.
