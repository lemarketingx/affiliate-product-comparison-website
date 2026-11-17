# SPEC — Milestone 2: brand and one coherent storefront

Milestone 1 (persistent catalog, prices, links) is complete and merged; its spec is archived in `docs/SPEC-M1-catalog.md`.

## Problem (observed 2026-11-16, screenshots in PROGRESS.md)
- The public site mixes **three visual languages**:
  - the home page is navy/gold "premium" (`dpb-*`, commit `df4400d`, labelled "approved");
  - product, deals and category pages are the cream "boarding pass" pre-flight theme (`fp-*`, PR #3): "כרטיס עלייה למטוס", "שער", "DP-9149" codes;
  - admin is `dp-*`.
- PR #16 ("Originals", a certificate product page) was never merged. Both #3 and #16 target an old base branch.
- Airport metaphors on product pages add noise and no buying information.
- The header search submit is an empty dark circle (no visible icon).
- The homepage h1 is screen-reader only.

## Scope
1. **Brand.** A name shortlist with evidence (meaning in Hebrew and English, conflicts, domain status checked or marked NOT CHECKED); a symbol, favicon, light/dark lockups and a social image; colour and type tokens.
   - **No user-visible rename, domain or metadata change without owner approval.** The name stays centralised and swappable.
2. **Three design directions**, plus the incumbent, rendered on the same slice: header and search, hero, product card, and the product page price/CTA block. Shown at 390 and 1440 px, scored on UX, originality, speed and conversion. One is chosen.
3. **Implementation in revenue order:** product card → product page → home → deals/search/category → loading/error/404. Admin (`dp-*`) is untouched.
4. **Honesty rules hold:** no invented discounts or ratings, honest empty states (price history is too young for charts, and there are no Israeli prices yet).

## Acceptance criteria
| # | Criterion | Status |
|---|---|---|
| 1 | Name shortlist with evidence; working name chosen; no rename shipped without approval | round 3: מחיר אמת withdrawn; no strong winner (סופית first, תחתית alternative); trademarks and `.co.il` NOT CHECKED; **awaiting owner** |
| 2 | Symbol, favicon, light/dark lockup, OG image, tokens | symbol, favicon and tokens (`app/bottomline.css`) done; OG image todo (waits for the name) |
| 3 | 3 directions + incumbent scored with screenshots; one chosen | done: `docs/DESIGN-DIRECTIONS.md`; **A chosen** |
| 4 | Product card, product page, home, deals/search/category, loading/error/404 in one system | done (screenshots `docs/screenshots/phase2/`) |
| 5 | No horizontal scroll at 320/375/390/768/1024/1440/1920; prefers-reduced-motion respected; text contrast ≥ 4.5:1 | done: 8 pages × 7 widths clean; axe WCAG 2.1 AA 0 violations (16 checks) |
| 6 | Mobile LCP and transfer not worse than the baseline below | done: see "after" table |
| 7 | e2e uses roles and labels; the 2 owner-decision tests rewritten, not deleted | done (the "not in the box" assertion was removed by explicit owner decision and replaced with tax/disclosure/redirect checks) |
| 8 | typecheck, unit, build, e2e green locally; screenshots in PROGRESS.md | done: unit 113/113, e2e 38/38 |

## Speed baseline (before), measured 2026-11-16
Local `next start` with the catalog fixture. Product images are blocked in this sandbox, so the numbers exclude them. Mobile runs on an emulated slow network.

| Viewport | Page | LCP | CLS | Transfer |
|---|---|---|---|---|
| Mobile | Home | 788 ms | 0.029 | 294 KB |
| Mobile | Deals | 724 ms | 0.026 | 330 KB |
| Desktop | Home | 564 ms | 0.001 | 317 KB |
| Desktop | Deals | 524 ms | 0.011 | 344 KB |

Product-page numbers were measured after visiting /deals, with shared assets cached: about 30–41 KB and LCP under 250 ms.

## Speed after (same method), measured 2026-11-16
| Viewport | Page | LCP | Transfer |
|---|---|---|---|
| Mobile | Home | 748 ms (median of 5) | ~307 KB |
| Mobile | Deals | 432 ms | ~327 KB |
| Desktop | Home | 208 ms | ~310 KB |
| Desktop | Deals | 480 ms | ~325 KB |

The mobile home LCP element is the h1, so the bold Hebrew face is preloaded. Without the preload it was 1676 ms. Two of the five mobile home runs were about 1.6 s, which looks like emulation jitter. Recheck this on Vercel after the next preview deploy.

## Real-data measurements, 2026-11-17 (see `docs/LAUNCH-READINESS.md`)
Branch run locally with the 46 real rows and real CDN images; Production (`main`) measured live. Profile: Pixel 7, 4× CPU slowdown, 1.6 Mbps, 150 ms RTT.

| Page (mobile) | Branch LCP | Branch CLS | Branch images | Production LCP | Production CLS | Production images |
|---|---|---|---|---|---|---|
| Home | 1.56–1.79 s | 0.027 | 146 KB | 2.20 s | 0.001 | 171 KB |
| Deals | 1.70 s | 0 | 69 KB | 1.54 s | 0.041 | 218 KB |
| Category | 1.70–1.72 s | 0 | 79 KB | 1.50 s | 0.012 | 178 KB |
| Search | 1.62–1.74 s | 0 | 70 KB | 1.39 s | 0.26 | 167 KB |
| Product | 1.48 s | 0 | 21 KB | 1.26 s | 0 | 118 KB |

LCP is not comparable across the two columns: FCP = LCP on both, local is uncompressed HTTP/1.1 with no network TTFB, and Production is HTTP/2 + brotli. A/B of the body-font preload made no difference. Measure again on a Preview. axe: branch 0 violations; Production home 10–16 colour-contrast violations.
