# Design directions: comparison and decision (2026-11-16)

All three directions plus the incumbent were rendered on the **same slice** with real catalog rows: header and search, hero, two product cards, and the price/CTA block. The live comparison is at `/admin/design-lab` (admin only, temporary). On the Preview it shows real product images; this sandbox cannot reach the AliExpress CDNs, so the screenshots here show placeholders. Screenshots: `docs/screenshots/design-lab/` (`before-*` = incumbent, `lab-a/b/c-*` = directions, at 390 and 1440 px).

## Inputs already in the repo
| Source | Description |
|---|---|
| Incumbent home (`df4400d`, "approved") | Navy and gold "premium" with a campaign carousel |
| Incumbent product, deals and category pages (PR #3, merged earlier) | Cream "boarding pass": "כרטיס עלייה למטוס", gates, flight codes |
| PR #16 "Originals" (not merged, old base) | Certificate-style product page |

Today the site mixes these two languages, plus a third in admin. That is the core problem.

## Scores (1–5)
| Direction | UX | Originality | Speed | Conversion | Total |
|---|---|---|---|---|---|
| **A: "השורה התחתונה"** | 5 | 4 | 5 | 4 | **18** |
| B: "שוק" | 4 | 3 | 3 | 4 | 14 |
| C: "לוח מחוונים" | 3 | 3 | 4 | 3 | 13 |
| Incumbent (two languages) | 3 | 4 | 4 | 3 | 14 |

**A: "השורה התחתונה" (the bottom line).** Ink on paper, with a single highlighter-yellow accent that marks "the bottom line". Prices are set in tabular monospace. The price block reads like a receipt: product price, then shipping, then VAT, then the bottom line. Each card shows when its price was last checked.
- **UX:** price, freshness and what the total includes are visible at a glance.
- **Originality:** the receipt-and-highlighter metaphor is the product's own promise, not a decorative gradient.
- **Speed:** a light palette, no hero imagery, and fonts already self-hosted.
- **Conversion:** one strong dark CTA, with trust lines directly under it.

**B: "שוק" (market).** A warm editorial look with large cover images.
- Pleasant, but generic.
- AliExpress product photos are square with white backgrounds, so a 4:3 cover crop cuts the products.
- Image-heavy, which costs LCP on mobile.

**C: "לוח מחוונים" (dashboard).** Dark and data-dense.
- Fits a power user, not a general Israeli shopper.
- Its honest KPIs (for example "0 prices current" on a cold catalog) look alarming to shoppers.

**Incumbent.** Two competing visual languages. The airport metaphor adds words without adding buying information.

## Decision: Direction A
Rules for implementing it:
- **Tokens:** `--ink #121417`, `--paper #FAFAF7`, `--line #E3E3DC`, `--hl #FFD43B` (highlight backgrounds only, never text), `--ok #0B7A4B`.
- **Type:** IBM Plex Sans Hebrew for UI, IBM Plex Mono for prices.
- **Contrast:** ink on paper is about 17:1. Yellow is used only behind ink text (about 13:1).
- **The receipt block** uses the existing tax logic (`lib/preflight/import-tax.ts`, `ProductCostCalculator`), not placeholder text. If shipping is unknown, it says so. The total is labelled as an estimate and never shown as a bare "X+".
- **Freshness** is on every price: "נבדק לפני N שעות", from `price_observed_at`.
- **No airport copy.** One visible h1 per page.
- **Admin `dp-*` is untouched.**
