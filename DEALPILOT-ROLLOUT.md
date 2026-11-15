# DealPilot: AliExpress affiliate platform (work in progress)

This branch proposes a new Hebrew RTL storefront and operator console, replacing the mortgage-referral homepage while **preserving the old application routes, SQL schema and source code** for safe review. The legacy workflow is not migrated and should not be deployed publicly as a fully converted platform until removed or isolated.

## Currently implemented

- New responsive public homepage / product discovery catalog with category and text filters.
- Explicitly labeled sample products, without invented prices, ratings, affiliate revenue, or fake shopping links.
- Candidate intake for HTTPS AliExpress item URLs, basic domain checking, duplicate checking and human-readable errors.
- Operations dashboard with product review queue, agent status and channel connection states.
- Clear affiliate disclosure and development-only search engine noindex.

Candidate submissions are **ephemeral browser state**. They are not persisted to a database, are not reviewed automatically, and are not published. No affiliate URL generation or external channel posting is enabled.

## Safe rollout checklist

1. Review the preview deployment and test on mobile.
2. Create a **separate Supabase project** or separate isolated database schema for the new ecommerce affiliate data. Never reuse the old mortgage lead data.
3. Set up real server-side product ingestion through an approved AliExpress affiliate API credential, with product ID deduplication and scheduled reconciliation.
4. Implement admin authentication and safe persisted product review statuses. Do not allow public product submissions to publish directly.
5. Generate valid tracked affiliate URLs server-side and test attribution against affiliate reporting.
6. Add /go tracked redirects with URL allowlists, rate limiting and fraud controls.
7. Add approved channel connectors (Telegram first), a publishing approval workflow and audit log.
8. Add a legal/privacy review, disclosure labels and real product imagery rights.
9. Before production launch, cleanly retire or isolate old mortgage routes and database connections, remove the noindex directive only when the site meets content/SEO readiness criteria.
10. Run `npm ci && npm run typecheck && npm test && npm run build` and check Vercel preview.

**Never put API keys or secrets in frontend or git.**

## Why this is staged

The site is a real design-and-interaction foundation, not yet an autonomous affiliate agent. Neither the user account's AliExpress affiliate access nor third-party publisher credentials have been provided or verified. A live-system claim before integrations are verified would be misleading.
