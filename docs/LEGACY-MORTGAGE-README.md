# קשר — מערכת שותפים לייעוץ משכנתאות

Standalone Next.js app for Vercel with Supabase email/password authentication and Postgres persistence. No redirects to ChatGPT or Sites.

## Local development

Node.js 22 or newer:

```sh
npm ci
npm run dev
```

`npm test` checks phone normalization, commission calculations, CSV exports and a real local Postgres-compatible authorization flow using PGlite. `npm run typecheck` and `npm run build` check the application.

## Provisioning a dedicated Supabase project

1. Create a dedicated project; do not apply `supabase/schema.sql` to an unrelated existing database.
2. Apply the reviewed SQL schema using the Supabase migration tooling. Tables are private: RLS is enabled and direct anonymous/authenticated table privileges are revoked. Narrow RPCs enforce ownership, verified accounts, partner status and admin-only operations.
3. Set the production Site URL to the Vercel production origin. Allow `/auth/callback` on that origin as an auth redirect. Configure email confirmation, recovery and production SMTP delivery. Supabase's built-in email service is not a general production mail service.
4. Fill `supabase/project.json` with the project HTTPS URL and **publishable** key, or set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are public by design. Never put secret/service-role keys in this repository or frontend.
5. Generate a random one-time activation code with at least 32 random bytes. Store only its SHA-256 hash in `public.setup_state` at id 1. Give the plaintext code privately to the owner. After signup and email verification, the owner uses `/setup`. The first visitor never automatically receives administrator privileges. Do not commit the plaintext code.
6. Deploy to Vercel using framework Next.js, installation `npm ci`, build `npm run build`, no output-directory override, and repository root as project root.

The app deliberately reports missing database setup (`503` from `/api/health`) rather than claiming data was saved. Public demo data is clearly marked and is separate from authenticated records.

## Functionality

- Admin dashboard, partners, leads, pipeline, events and settings.
- Partner signup, approval, suspension and personal referral links.
- Public referral intake with consent, normalized phone duplicate prevention and transactional audit records.
- Partners only receive their own leads; phone numbers are masked and internal notes/fees are removed server-side.
- Commission remains unset until the advisor selects a rule. Recording payment snapshots that rule; changing the rule does not rewrite past commissions. Commission payout requires prior approval of the exact amount and cannot be edited after payout.
- Ordinary email/password login, email verification, reset password, POST logout and one-time secure administrator activation.

## Rollout status

The source conversion and local tests are prepared. Production rollout requires the dedicated project, configured public connection values, auth URLs/email delivery and deployment verification. The previous deployment must be replaced; a local build does not prove the live site is updated.
