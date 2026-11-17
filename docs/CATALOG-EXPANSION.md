# Catalog expansion, 2026-11-17

**Rule:** original branded products only. Rules are not relaxed to hit a number: more than 5,000 reported sales, ILS price, Hebrew title, brand corroborated by the store or supplier, and a valid affiliate link.

**Source of the data below:** the 1,715 products the AliExpress Affiliate API (`aliexpress.affiliate.product.query`, sorted by `LAST_VOLUME_DESC`) returned into our database on 2026-11-16, read-only. "Reported sales" is the provider's `orders` field (a recent period, not lifetime). "Commission" is the provider's `commission_rate` field. These are provider figures, not our revenue.

## What the data says

| Search term | Fetched | Brand verified | Above 5,000 sales with brand | 1,000–5,000 sales with brand | Avg. commission (brand) | Published |
|---|---|---|---|---|---|---|
| UGREEN | 94 | 79 | **15** | 64 | 7.5% | 15 |
| ROCKBROS | 100 | 38 | **12** | 26 | 7.0% | 12 |
| Baseus car | 98 | 45 | **8** | 37 | 8.2% | 8 |
| QCY | 89 | 50 | **5** | 11 | 7.0% | 5 |
| Edifier | 97 | 45 | 2 | 22 | 7.0% | 2 |
| Soundcore | 40 | 3 | 2 | 1 | 7.0% | 2 |
| POCO | 93 | 2 | 1 | 1 | 9.0% | 1 |
| Xiaomi | 89 | **0** | 0 (43 above 5,000, none verified) | 0 | – | 0 |
| Redmi | 84 | 1 | 0 (14 above 5,000) | 1 | 9.0% | 0 |
| Baseus (bare) | 99 | **0** | 0 | 0 | – | 0 |
| Ulanzi / 70mai / DDPAI / VIOFO / Naturehike | 49–100 each | 32–54 | 0 | 0–25 | 7.0% | 0 |
| Dreame / Roborock / Yeelight / Reolink / Xiaomi home | 50–96 each | 0–21 | 0–1 | 0–7 | 7.0% | 0 (the 1 was a parts store, removed) |

Findings:
1. **The Xiaomi / Redmi / POCO demand is mostly not Xiaomi.** Their high-sales results are compatible cables and chargers from general stores (e.g. "Stone's Store": 27 POCO results), sometimes with "מקורי של שיאומי" in the title. The rules reject them correctly, and they are not counted as brand demand.
2. **Brand-run stores with proven demand** (official, flagship or direct stores in our data):

| Brand | Items | Above 5,000 | Above 3,000 | Max sales | Total reported sales | Brand in title | Avg. commission |
|---|---|---|---|---|---|---|---|
| UGREEN | 100 | 17 | 56 | 14,012 | 382,724 | 85% | 7.4% |
| Baseus | 29 | 8 | 14 | 16,018 | 113,852 | 90% | **8.8%** |
| QCY | 36 | 5 | 6 | 9,653 | 74,835 | 97% | 7.0% |
| **Toocki** (new) | 7 | 2 | 4 | 5,835 | 24,703 | 100% | **9.0%** |
| Ulanzi | 44 | 0 | 4 | 4,422 | 48,823 | 93% | 7.0% |
| 70mai | 33 | 0 | 2 | 4,980 | 34,935 | 100% | 7.1% |
| eufy | 11 | 0 | 1 | 4,630 | 8,336 | 0% | 8.6% |

3. **No home brand has proof yet.** Dreame, Roborock, Yeelight, Reolink and Xiaomi home have no verified product above 5,000 sales. The home category stays hidden (empty categories are not shown).

## What changed in the code (branch only)
- **New brand:** Toocki (four brand stores, 9% commission, two items above 5,000).
- **Model-level search terms.** Results are sorted by sales, so a new term surfaces new products, while a repeated term returns the same exhausted list.
  - Tech: `UGREEN Nexode`, `UGREEN USB C hub`, `UGREEN earbuds`, `Baseus charger`, `Baseus power bank`, `Baseus earbuds`, `QCY earbuds`, `Toocki`.
  - Car: `Baseus car holder`, `Baseus car charger`.
  - Sport: `ROCKBROS bike light`, `ROCKBROS cycling bag`.
- **Removed:** the bare `Baseus` term (99 results, 0 verified: it returned unrelated products). Removed terms are deactivated automatically on the next sync.
- **Not added:** Ulanzi, 70mai, eufy, Naturehike, Haylou and Moondrop. They have brand stores, but no product above 5,000 sales. That is the owner's threshold decision to keep, and it was not relaxed.

## What is NOT verified
- **No new product was imported in this round.** The new terms reach the live job only after a merge; there are no AliExpress API credentials in this environment. How many new products they will yield is unknown. Expect some, not a target number.
- Sales and commission figures are the provider's and were not verified independently. Commission paid depends on AliExpress program terms.
- Israeli demand (search volume in Israel) was not measured: no keyword-tool access here.
