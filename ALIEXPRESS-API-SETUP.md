# AliExpress Affiliate API connection (Preview only)

## Required Vercel environment variables

Configure under Project → Settings → Environment Variables, selecting **Preview**:
- `ALIEXPRESS_APP_KEY` — existing AliExpress Affiliates App Key
- `ALIEXPRESS_APP_SECRET` — secret; **never commit, paste in chat, or expose to client-side JavaScript**
- `DEALPILOT_ADMIN_TOKEN` — **additional required** long, random admin diagnostic token, minimum 24 characters (32+ random bytes strongly recommended). Store it only in Vercel and in your private password manager. This is NOT your AliExpress App Secret.
- `ALIEXPRESS_TRACKING_ID` — optional during initial search test; required before validating commissions and launching affiliate links.

After saving variables, trigger a fresh Preview deployment for the feature branch.

## How to test

1. Open the latest successful Vercel Preview for `feat/dealpilot-aliexpress-rebuild`.
2. Navigate to **מרכז שליטה**.
3. In **בדיקת מוצרים אמיתיים מ-AliExpress**, enter your dedicated `DEALPILOT_ADMIN_TOKEN` and a search term like `home organizer`.
4. Click **בדוק חיבור**.
5. A success message means the platform responded with a structurally valid product response. Errors are intentionally sanitized.
6. Verify price/currency, shipment destination, and any real promotion link on the AliExpress portal before publishing anything.

This endpoint does not persist results and does not publish to social channels. Tokens are only kept in the current page's React memory (not localStorage).

## API implementation

- Server-only client: `lib/aliexpress/affiliate.ts`.
- Private diagnostic endpoint: `POST /api/dealpilot/products`.
- Live control panel: `app/aliexpress-tester.tsx`.
- Uses HTTPS `https://api-sg.aliexpress.com/sync`, method `aliexpress.affiliate.product.query`, TOP-style HMAC-MD5 signing, GMT+8 timestamp.
- Requests a small set of results (10), language HE, currency USD and destination IL.
- Requires an additional admin token with constant-time comparison; returns no credentials and never exposes the upstream raw payload.

**Important compatibility warning:** The TOP documentation for this method is labeled deprecated on the old Alibaba documentation site. Newer AliExpress app configurations may require a different IOP protocol/endpoint/signature. If the test responds with `UNEXPECTED_RESPONSE_SHAPE`, `PROVIDER_ERROR_...`, or `PROVIDER_HTTP_...`, validate the endpoint and method against the exact API documentation available in your AliExpress App Console. Do not blindly switch signing algorithms or print secrets into logs.

## Not ready for production

- The former mortgage referrals routes and Supabase schema still exist in this branch; keep this branch in Preview.
- No automatic publishing or affiliate revenue attribution is active.
- The administrator diagnostic token is a temporary security boundary; for production, move to authenticated owner accounts and server-side per-user rate limits.
- Review dependency vulnerabilities before launch; avoid automatic breaking dependency upgrades.
