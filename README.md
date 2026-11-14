# DealPilot

Hebrew RTL AliExpress affiliate product discovery and a separate private administration workspace. Development branch: `feat/dealpilot-aliexpress-rebuild`. Do not merge or promote to production without owner approval.

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
