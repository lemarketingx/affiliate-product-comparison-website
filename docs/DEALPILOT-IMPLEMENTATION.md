# DealPilot implementation and activation gates

## Audit and boundaries

Work started from `feat/dealpilot-aliexpress-rebuild` at `d958808`. The existing homepage exposed an operations console via React state, used client-only demonstration candidates, and included optional database-backed click tracking. The provider's working minimal product query, HMAC signing, timeouts and six-hour catalog cache were retained.

Changes are confined to this branch. No merge to main, production promotion, database creation, schema migration, Cron, paid AI request or channel publication is authorized by this implementation. Existing mortgage source and migrations are retained; its runtime paths return 404 on this branch, and its Supabase config always resolves to null. The main branch remains unchanged.

## Implemented routes

Public: `/`, `/deals`, `/categories`, `/categories/[slug]`, `/products/[id]`, `/search`, `/guides`, `/about`, `/disclosure`, `/privacy`, `/terms`, `/go/[id]`.

Private: `/admin/login`, `/admin` (redirect), `/admin/dashboard`, `/admin/products`, `/admin/discovery`, `/admin/content`, `/admin/channels`, `/admin/orders`, `/admin/automations`, `/admin/settings`.

Server APIs: `/api/auth/[...nextauth]`, `/api/dealpilot/products`, `/api/dealpilot/stats` (explicitly disabled measurement), `/api/admin/orders`, `/api/health`. Mortgage endpoints remain in the build for source preservation but are denied at the proxy; their database configuration is additionally disconnected.

## Public experience

Blue/navy RTL design system, local licensed Hebrew font files, mobile menu and search, four category feeds, supplier order-count sorting, product details, related products, affiliate disclosure, loading/error/unavailable states and legal-information drafts. No fabricated ratings, savings, reviews, prices, shipping promises or sales counts. Supplier titles are retained when no reviewed Hebrew copy exists. The current provider supplies one main image and no complete verified specification, so the detail page shows that image and explicitly describes missing information rather than inventing a gallery or benefits.

Fixed catalog queries are cached for six hours. Timestamps are stored with supplier responses. IDs are deduplicated. The existing minimal request parameters remain unchanged. Unknown counts and reports are distinct from zero. `/go` resolves a supplier-returned promotion URL by ID; visitor-supplied destination parameters are ignored. Provider promotion fields identical to the source URL are rejected as affiliate links. Currency is not converted.

## Authentication setup — required before real admin use

The new justified production dependency is stable `next-auth@4.24.15`, supporting the installed Next 16 and React 19. GitHub OAuth uses PKCE/state, the library's encrypted JWT session cookies, CSRF handling, an eight-hour session, and a server allowlist of immutable numeric GitHub account IDs. No password store or new database is required. Authentication is checked in the proxy, private layout/data pages and administrative API handlers. Removing an ID revokes its authorization on subsequent requests. The diagnostic token cannot log in or authorize management APIs.

Configure secrets directly in the Vercel Preview environment, never in chat or tracked source:

- `GITHUB_ID` and `GITHUB_SECRET`: dedicated GitHub OAuth application.
- `NEXTAUTH_SECRET`: cryptographically random value of at least 32 characters.
- `NEXTAUTH_URL`: stable Preview hostname used by the OAuth callback.
- `DEALPILOT_ADMIN_GITHUB_IDS`: comma-separated numeric account IDs.
- OAuth callback: `https://<stable-preview-host>/api/auth/callback/github`.
- Optional `DEALPILOT_SITE_URL`: canonical origin; otherwise the current Vercel deployment origin is used.

Until configured, login is disabled and every private route fails closed. Full external OAuth consent/callback requires the owner to configure this application; local tests verify sessions using an ephemeral test-only key, not production credentials.

Per-process limits guard login/OAuth, Scout and report calls; product queries have a bounded outbound budget. These counters reset across instances/deployments and **are not a deployment-wide quota or brute-force guarantee**. Before production activation, configure centralized Vercel Firewall limits for authentication and admin API paths and verify their behavior. No firewall purchase or configuration change has been made. Other prelaunch work: review operational logs, dependency advisories, complete contact/operator details, confirm provider permissions and real OAuth sign-in, and decide storage. Security headers include nosniff, referrer policy, restricted capabilities and a limited CSP (`frame-ancestors`, `object-src`, `base-uri`); this is not a full script CSP. A production security assessment remains necessary.

## Product workflow and minimal storage proposal

Review/approve/reject/edit and content export work in memory within the authenticated admin layout. They reset on full refresh or exit, do not change the public catalog and do not claim to save schedules. Missing price/currency/image/source/promotion block approval independently of numeric demand. Editing invalidates approval. Demand, data completeness and theoretical commission are separate signals.

Suggested first durable publishing mechanism: a small reviewed `data/approved-products.json` maintained through Git commits/PRs, with explicit approval timestamps and product IDs. Incremental storage infrastructure cost: $0 within the existing repository/hosting allowances. It provides version history and rollback for low-volume curation; it is not a concurrent job queue and does not permit runtime writes from Vercel Functions. Implement only after the owner accepts this workflow. A multi-user review queue or scheduler needs a separately selected durable store and current cost review; no new service has been provisioned.

Content Studio currently exports deterministic Telegram/Facebook/Instagram templates or short-video storyboards using known product fields and a disclosure. It is explicitly not an AI/finished-video service. No AI provider or channel API is connected. Telegram is the first proposed channel, pending Bot API credentials, channel administrator permission, reviewed preview content and explicit approval for each real publication. No message has been sent.

## Analytics and orders

Click writes/reads are disabled even if old DealPilot database variables remain set. No cookie, IP or fingerprint click collection was added. AliExpress remains the only source for orders and commissions. The order provider is disabled by default and requires `ALIEXPRESS_ORDER_REPORTS_ENABLED=true` only after verifying the current API contract and account entitlements. Queries are manual, limited to one 24-hour period and one page of 20 records; pagination is disclosed. Estimated/finished commission never becomes approved payout. See `ALIEXPRESS-ORDERS.md` for official source links and deprecated-documentation caveats.

## SEO and launch state

Preview remains noindex at metadata and response-header layers. Robots disallows crawling and sitemap intentionally has no entries until launch readiness. No Product structured data is emitted because verified product specifications/availability are insufficient. Legal pages describe actual current behavior, disclose external image requests and identify missing operator/contact details; they require owner review before public launch.

## QA inventory

- Public navigation/search/filter/sort, product detail/source links, removed or unavailable products, valid `/go` destinations, no promotional badges unsupported by data.
- Admin denial, diagnostic-token denial, allowed/revoked local sessions, CSRF origin checks, logout, missing-provider errors, disabled reports and null commissions.
- Local review approval conditions, edits invalidate approval, title/notes editing, rejection, prepared templates, copy/download and refresh reset.
- Screenshots at 375, 412, 768, 1366 and 1920 CSS pixels; inspect RTL, clipping, image fallback, mobile menu, footer and meaningful populated states.
- Unit tests for orders/refunds/malformed payloads, URL allowlists, exact admin membership and quota guards; inherited database test uses in-memory PGlite only, never the remote mortgage database.
- Test-only fixture provider runs on isolated localhost port 3102 via an explicit Node preload, uses fake keys and clearly marked fixture products, and is never loaded by normal dev/build/start or Vercel. Empty-provider tests run on 3101. No fixture results are represented as live AliExpress validation.

Final observed test/deployment results are recorded in `DEALPILOT-QA.md`.
