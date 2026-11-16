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
| 1 | Name shortlist with evidence; working name chosen; no rename shipped without approval | done: `docs/BRAND-NAMING.md`; recommend תכל'ס (Tachles); **awaiting owner approval** |
| 2 | Symbol, favicon, light/dark lockup, OG image, tokens | symbol, favicon and lockups done (`public/brand/`); OG image and tokens next |
| 3 | 3 directions + incumbent scored with screenshots; one chosen | done: `docs/DESIGN-DIRECTIONS.md`; **A chosen** |
| 4 | Product card, product page, home, deals/search/category, loading/error/404 in one system | todo |
| 5 | No horizontal scroll at 320/375/390/768/1024/1440/1920; prefers-reduced-motion respected; text contrast ≥ 4.5:1 | todo |
| 6 | Mobile LCP and transfer not worse than the baseline below | todo |
| 7 | e2e uses roles and labels; the 2 owner-decision tests rewritten, not deleted | todo |
| 8 | typecheck, unit, build, e2e green locally; screenshots in PROGRESS.md | todo |

## Speed baseline (before), measured 2026-11-16
Local `next start` with the catalog fixture. Product images are blocked in this sandbox, so the numbers exclude them. Mobile runs on an emulated slow network.

| Viewport | Page | LCP | CLS | Transfer |
|---|---|---|---|---|
| Mobile | Home | 788 ms | 0.029 | 294 KB |
| Mobile | Deals | 724 ms | 0.026 | 330 KB |
| Desktop | Home | 564 ms | 0.001 | 317 KB |
| Desktop | Deals | 524 ms | 0.011 | 344 KB |

Product-page numbers were measured after visiting /deals, with shared assets cached: about 30–41 KB and LCP under 250 ms.
