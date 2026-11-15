# DealPilot

Hebrew RTL AliExpress affiliate product discovery and a separate private administration workspace. Development branch: `feat/dealpilot-aliexpress-rebuild`. Do not merge or promote to production without owner approval.

The storefront uses owner-authorized discovery mode: products with more than 500 reported purchases and complete Hebrew core data are visible with a pending-verification label. A verified badge still requires 4.7 stars, an Israeli review and verified Israel shipping with fresh official evidence. Missing evidence never becomes a verified badge. Review permissions and rating/delivery evidence remain unavailable. See [live quality checks and required access](docs/ALIEXPRESS-QUALITY.md).

## Pre-flight engine (autopilot, destinations, landed cost)

`/autopilot`, `/missions` and the per-product "מה כנראה לא בקופסה" block turn an Israeli need into a buying plan: what to buy, what is usually not in the box, how to search, Israel fit, when to buy locally and an honest landed-cost estimate. All destinations and guides are owner-approved (`lib/preflight/approvals.ts`); new ones stay hidden until approved. Import-tax values are not computed until verified from an official source. See [pre-flight engine](docs/DEALPILOT-PREFLIGHT.md).

## Public catalog

Up to ~650 published products from staged, cached, quota-bounded AliExpress searches (>5000 reported sales, ILS, Hebrew, valid affiliate link), 24 per page with search, filters and a public build report at `/catalog-status`. See [catalog](docs/DEALPILOT-CATALOG.md).

## Run and verify

Node 22+:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run start
```

Browser checks: `npm run test:e2e` after a successful build. Windows uses installed Chrome; other systems require `npx playwright install chromium`. The suite starts two isolated localhost servers and uses explicitly marked fixtures only in the test-only process. No real AliExpress credentials or external OAuth login are required for these tests. The application itself never loads fixture data.

Without AliExpress credentials the storefront presents a genuine unavailable state. Admin login remains locked until dedicated GitHub OAuth credentials, a session secret and a numeric administrator allowlist are configured. Never paste secrets into chat or tracked files.

## Current capabilities and boundaries

- Public catalog, local search/filtering, categories, product details and server-resolved affiliate redirects.
- Private Scout searches, review/approval/editing and template export in memory only; refresh/exit clears this work.
- No click database, remote mortgage database access, scheduled API jobs, paid AI connection or social publication.
- Order reports disabled until current API contract and account permissions are verified; estimated commissions are never approved payouts.
- Preview remains noindex; operator/contact details and production security controls are launch prerequisites.

See [implementation and configuration](docs/DEALPILOT-IMPLEMENTATION.md), [orders-provider research](docs/ALIEXPRESS-ORDERS.md), and [observed QA results](docs/DEALPILOT-QA.md).

Mortgage source/migrations are retained but disconnected on this branch. The historical setup document is preserved in [legacy documentation](docs/LEGACY-MORTGAGE-README.md); it is not a DealPilot provisioning guide. The main branch has not been modified by this work.
