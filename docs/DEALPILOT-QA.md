# DealPilot — observed QA and handoff

Date: 14 November 2026 (Asia/Jerusalem). Application commit tested/deployed: `dd93e3c1894a0febd9dd3848116a207de7bd89a0`. Subsequent handoff commit changes documentation and screenshot capture only.

## Verified build and code

| Check | Final result |
|---|---|
| `npm run typecheck` | Passed against patched dependencies |
| `npm test` | 22/22 passed |
| `npm run build` | Passed, Next.js 16.4.6 |
| `npm run test:e2e` | 11/11 passed on the upgraded build |
| Populated workflow screenshot rerun | 1/1 passed |
| `npm audit --package-lock-only` | 0 reported vulnerabilities across production/development lockfile |
| `git diff --check` | Passed |
| Lint | No lint script/config exists on this development branch |
| Vercel build | Passed; deployment READY, build output completed in 33 seconds |
| Vercel runtime errors | No error/fatal log groups returned for this deployment in the inspected 15-minute window |

Initial dependency audit found five affected packages, including critical Next.js advisories. Next.js was upgraded from 16.3.4 to 16.4.6, Zod from 3.25.76 to 4.6.7, and vulnerable transitive entries were updated. Large local archive transfers were slow; downloaded official npm archives were verified against the lockfile SHA-512 integrities before caching/installing. The final tests and build ran on the upgraded installation, not the original versions.

Advisory sources: [Next.js upstream advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). A zero advisory count is not a guarantee against undiscovered vulnerabilities.

## Live Vercel verification

Verified application Preview: https://affiliate-product-comparison-website-dt285tiwv.vercel.app

Draft PR: https://github.com/lemarketingx/affiliate-product-comparison-website/pull/2

The new deployment returned **40 real supplier product cards** across four fixed category queries. Homepage, catalog and a product page were also inspected in the in-app browser, including actual supplier images, source currency, source timestamp and disclosure. No fixture preload is used in Vercel.

| Live request | Observed |
|---|---|
| `/deals` | HTTP 200, 40 product cards, `X-Robots-Tag: noindex, nofollow` |
| `/products/1005012994993648` | HTTP 200; title, image and USD price from supplier; missing shipping/specification information disclosed |
| `/go/1005012994993648?source=catalog` | HTTP 307 to an HTTPS `s.click.aliexpress.com` destination; external destination was not followed in the HTTP check |
| `/categories/tech` | HTTP 200 |
| `/search?q=Kitchen` | HTTP 200 |
| `/admin/dashboard` without session | HTTP 307 to `/admin/login` |
| `/admin/login` | HTTP 200, explicit OAuth-not-configured state; no diagnostic-token login |
| `/api/admin/orders`, `/api/dealpilot/products`, `/api/dealpilot/stats` without session | HTTP 401 |
| `/setup` | HTTP 404, legacy path blocked |
| `/go/invalid` | HTTP 404 |
| `/robots.txt` | HTTP 200, crawling disallowed; Preview noindex retained |

Live product counts/prices can change as the supplier cache refreshes. The validated redirect proves routing to a supplier-returned promotion link; it does **not** prove payable commission attribution, shipping to Israel or a completed order.

## Functional and visual coverage

Browser tests exercised:

- Public discovery navigation; category selection/reset; catalog filter and sorting controls; consecutive header searches on the same route.
- Unauthorized admin/API denial, diagnostic-token denial, removed administrator authorization, a valid encrypted local test session, foreign-origin rejection and logout.
- Invalid/arbitrary redirect destinations, missing promotion link, duplicate supplier products, product detail navigation.
- Local review approval gating, rejection, source confirmation, edits invalidating approval, custom Scout results retained into Content Studio.
- Telegram/Instagram/short-video template formats, clipboard disclosure, text download and refresh clearing all temporary decisions.
- Explicit empty-provider states, unknown report totals and null approved commissions.
- RTL and document overflow at 375, 412, 768, 1366 and 1920 CSS pixels; mobile public menu and all eight links in the admin dropdown.

The populated flow uses clearly labeled test fixtures on isolated localhost port 3102, with fake credentials and a test-only Node preload; port 3101 covers genuine unavailable states. These tests do not exercise an external GitHub OAuth consent flow or a live order report.

Screenshot evidence (checkout-local, intentionally excluded from Git):

- `outputs/qa/home-desktop.png`, `home-mobile.png`: public unavailable-provider state.
- `outputs/qa/admin-populated-desktop.png`, `admin-populated-mobile.png`: local fixture workflow.
- `outputs/qa/admin-populated-desktop-viewport.png`, `admin-populated-mobile-viewport.png`, `admin-populated-mobile-menu.png`: reviewed final admin viewports/menu.
- `outputs/qa/vercel-home.png`, `vercel-catalog.png`, `vercel-product.png`: real deployed supplier state in the available narrow in-app browser viewport.

No document overflow, clipped product content, distorted displayed images or broken visible controls were found in the inspected states. A mobile admin link row that was partly clipped was replaced by an accessible dropdown and re-tested. Initial E2E failures revealed an incorrect heading assertion and a same-origin check comparing Next's internal localhost URL instead of the browser Host; both were corrected, with a regression test for the latter. Final suites have no failures.

These are viewport/browser checks, not tests on physical iPhone/Android hardware. No Lighthouse/Core Web Vitals field score or full accessibility audit is claimed. External provider images and long supplier titles still need editorial curation before a commercial launch.

## Activation gates and residual risks

1. **Real admin OAuth is not configured in Preview.** Owner must register/configure the dedicated GitHub OAuth application, server session secret, stable callback URL and numeric administrator allowlist. No credentials should be pasted into chat. Local session authorization was tested; external consent/callback remains unverified.
2. **Rate limits currently apply per process.** Configure and verify deployment-wide authentication/API limits before production activation. Sessions/API authorization are real, but distributed abuse protection is not claimed.
3. **Orders and commissions are not live.** Official historical method names were researched, but the documentation category is deprecated and account entitlements/current contract were not verified. Reports remain disabled by default. No real approved commission or income has been established. See `ALIEXPRESS-ORDERS.md`.
4. **Review decisions/content are temporary.** They are retained only in the authenticated layout's memory, reset on refresh/exit and never publish to the storefront. A reviewed Git-backed JSON catalog is proposed as a $0 incremental-infrastructure starting point; owner acceptance is required before implementation. No new database was created.
5. **AI, video, Telegram and other social channels are disconnected.** Current text/storyboard output is explicitly a deterministic template. No paid provider, scheduled job or actual publication was activated.
6. **Launch/legal/editorial readiness remains pending.** Add operator/contact details, review policies, curate supplier titles/images and product choices, verify Israeli shipping/affiliate attribution and review security controls before considering indexing. Preview remains noindex; sitemap has no published entries.

## Repository boundary

Changes were committed/pushed only to `feat/dealpilot-aliexpress-rebuild`. PR 2 remains draft and unmerged. The local `main` ref remained `634364f835257a7ed7db369bc4371c9a6ff9a78f` throughout. No production deployment promotion, mortgage database query/migration, new storage service, Cron, paid AI call or external channel message was performed.
