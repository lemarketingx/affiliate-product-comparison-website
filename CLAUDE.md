# CLAUDE.md — working rules for this repository

Hebrew RTL, mobile-first Israeli shopping-intelligence site on AliExpress Affiliate data (working name DealPilot).
Vision: `PRODUCT-VISION.md` · current task: `SPEC.md` (M1 archived in `docs/SPEC-M1-catalog.md`) · backlog: `TASKS.md` · log: `PROGRESS.md` · deep docs: `docs/`.

## Architecture
- Next.js 16 App Router + TypeScript, deployed on Vercel (Hobby: cron at most daily, 100 deploys/day).
- `lib/aliexpress/` — signed Affiliate API client (`affiliate.ts`, server-only), pure normaliser (`normalize.ts`), public rules (`catalog-build.ts` → `publicRejections`).
- `lib/catalog-store/` — persistent catalog. `pipeline.ts` (pure: discover → validate → dedupe → ingest → price refresh), `price-view.ts` (pure price policy and diagnostics), `server.ts` (Supabase RPC adapter, jobs, cached reads).
- `supabase/migrations/*.sql` — the only schema source. All writes go through `dp_*` SQL functions (one jsonb arg); service role only; RLS on.
- `getCatalog()` in `lib/aliexpress/catalog.ts` reads the database when `DEALPILOT_SUPABASE_*` is set, otherwise the legacy live cached build.
- Jobs: `GET /api/cron/catalog?job=discover|prices|links` (three daily crons, Bearer `CRON_SECRET`, fails closed). One job at a time (DB lock → 409). Admin: `/admin/catalog`, `POST /api/admin/catalog`.
- AliExpress calls are paced ≥ 1.1 s (`lib/aliexpress/pacer.ts`); never add unpaced provider calls. productdetail.get parameters: `lib/aliexpress/detail-profiles.ts` (tracking_id is rejected there).
- `proxy.ts` guards `/admin`, `/api/admin`, `/api/dealpilot` (GitHub OAuth allowlist). Do not put cron routes under those paths.

## Commands
```sh
npm ci
npm run typecheck
npm test            # node:test, imports .ts directly; pglite runs the real SQL
npm run build
npm run test:e2e    # Playwright; use the preinstalled Chromium, do not run `playwright install`
```

## Git
- Work on the assigned feature branch; never push to `main`, never force-push shared branches, never rewrite another agent's branch.
- Small, verified commits. No PR unless the owner asks. Do not merge/rebase other open PRs (#3, #16, #19) into your work.

## Security
- Secrets only in Vercel env vars. Never commit, log or echo keys. Never `NEXT_PUBLIC_` a secret.
- Never use the mortgage Supabase projects (`mortgai`, `kesher-mortgage-partners`) or the `mortgai` Vercel project.
- Provider/database error text is never forwarded to visitors; return short codes.
- `/go/[id]` only redirects to affiliate links stored for a published product; never to a visitor-supplied URL.

## Price policy
- Show only a provider-returned price, with its source field, currency and observation time.
- A price older than `DEALPILOT_PRICE_MAX_AGE_HOURS` (default 30; was 48 until 2026-11-17) is withheld, never shown as current. Above 12 h the storefront says it may have changed.
- Prices are re-checked by product ID every 4 h (`.github/workflows/price-refresh.yml`, needs repo secret `DEALPILOT_CRON_SECRET`) plus the daily Vercel cron; min re-check age 2 h.
- Never invent prices, discounts, availability, warranty, ratings, sales, savings or official-store status.
- Never label a USD amount as ILS. Never convert a positive-feedback % into stars.
- Price refresh is a scheduled, budgeted job — never a provider call per page view.

## Data policy
- A product is identified by (source, product_id); upserts only, no duplicates.
- Quality before quantity: never relax `publicRejections` to hit the 50/day target; report the shortfall.
- Clicks ≠ conversions ≠ commissions. Only provider-verified reports may be shown as revenue.

## Testing requirements
- Every change: typecheck + unit tests + build. UI changes: Playwright/browser screenshots at 320–1920px.
- Fixture tests prove code paths, not live integrations. Report live checks as PASS only with real evidence; otherwise BLOCKED / NOT TESTED.
- Never weaken or delete a correct test to make it pass.
