# Catalog expansion, 2026-11-17

**Rule:** original branded products only. Rules are not relaxed to hit a number: more than 5,000 reported sales, ILS price, Hebrew title, brand corroborated by the store or supplier, and a valid affiliate link.

**Source of the data below:** the 1,715 products the AliExpress Affiliate API (`aliexpress.affiliate.product.query`, sorted by `LAST_VOLUME_DESC`) returned into our database on 2026-11-16, read-only. "Reported sales" is the provider's `orders` field (a recent period, not lifetime). "Commission" is the provider's `commission_rate` field. These are provider figures, not our revenue.

## What the data says

Per search term. **A term is not a brand:** the Soundcore, Edifier and POCO rows below count Baseus and UGREEN products those searches returned; no Soundcore, Edifier or POCO product is published.

| Search term | Fetched | Brand verified (any brand) | Above 5,000 sales with brand | 1,000–5,000 sales with brand | Avg. commission (brand) | Published |
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
- **Model-level search terms.** This is an assumption: a new term *may* surface products the broad term missed. Two of its targets, Nexode Air and Studio Pro, are already published.
  - Tech: `UGREEN Nexode`, `UGREEN USB C hub`, `UGREEN earbuds`, `Baseus charger`, `Baseus power bank`, `Baseus earbuds`, `QCY earbuds`, `Toocki`.
  - Car: `Baseus car holder`, `Baseus car charger`.
  - Sport: `ROCKBROS bike light`, `ROCKBROS cycling bag`.
- **Removed:** the bare `Baseus` term (99 results, 0 verified: it returned unrelated products). Removed terms are deactivated automatically on the next sync.
- **Not added:** Ulanzi, 70mai, eufy, Naturehike, Haylou and Moondrop. They have brand stores, but no product above 5,000 sales. That is the owner's threshold decision to keep, and it was not relaxed.

## Provable yield, and the real lever (read-only queries)
- **Toocki:** 3 stored products would pass every rule once the brand is added. That is the only yield the data proves.
- **Brand-verified products above 5,000 sales that are not yet published:** 0. The 1 found was the parts listing, now removed. Headroom above the current threshold is close to exhausted for these brands.
- **The real growth lever is the threshold:**
  - 73 brand-verified stored products have 3,000–5,000 reported sales, 45 of them from brand-run stores (UGREEN, Ulanzi, QCY, Toocki and others).
  - Lowering the threshold to 3,000 would make them eligible.
  - **That is the owner's decision.** It was not changed here.
- Re-ingesting a product does not change its category (`dp_ingest` keeps the first one), so the new "Baseus charger" term cannot pull car products out of "car".

## What is NOT verified
- **No new product was imported in this round.** The new terms reach the live job only after a merge; there are no AliExpress API credentials in this environment. How many new products they will yield is unknown. Expect some, not a target number.
- Sales and commission figures are the provider's and were not verified independently. Commission paid depends on AliExpress program terms.
- Israeli demand (search volume in Israel) was not measured: no keyword-tool access here.

## 2026-11-18 · Owner: "brands are missing"
**Why 7 registered brands do not show** (live database, read-only):
- Redmi, Anker, Soundcore, Dreame, Roborock, Reolink and Amazfit have no listed product.
- Their bare-name searches return mostly other stores' compatible accessories:
  - Amazfit watch straps from "CRESTED Watchband Store" (49 of 49 results rejected for brand);
  - Roborock and Dreame spare parts from parts stores;
  - Redmi cables from "Stone's Store".
- Reolink's best result had 38 sales.
- The rules reject these correctly.

**Changes (branch):**
- **Product-level terms** to reach the brands' own listings: `Anker power bank`, `Soundcore earbuds`, `Amazfit smart watch`, `Dreame robot vacuum`, `Roborock robot vacuum`, `Reolink camera`, `Yeelight lamp`. `Redmi Buds` and `Redmi Watch` were already on main.
- **7 new brands**, each with an official or flagship AliExpress store in our data and products above the 500-sales threshold with the brand in the title:

  | Brand | Store | Candidates | Max sales |
  |---|---|---|---|
  | Vention | VEnTIOn Official/Flagship Store | 4 | 4,089 |
  | Moondrop | MOONDROP Official Store | 4 | 2,506 |
  | Haylou | Haylou Official/Flagship Store | 3 | 3,542 |
  | SoundPEATS | SoundPEATS Official Store | 3 | 1,525 |
  | ESSAGER | ESSAGER Flagship Store | 2 | 9,954 |
  | 1MORE | 1MORE Flagship Store | 1 | 910 |
  | Nothing | Nothing Flagship Store | 1 | 773 |

- **Not added:** stores whose name is not a recognisable brand ("I LOVE LUO YOO Store", "Sanag", "QOOVI").

**NOT VERIFIED:** how many products the new terms and brands will publish. They run on the next discovery after a merge (daily 02:17 UTC, or "discover" in `/admin/catalog`). Logos for the 7 new brands are not added yet; they show the monogram.

## 2026-11-23 · All terms exhausted; owner: "find more terms"
**State (live DB, read-only):** 873 published of 4,980 stored. All 57 active terms were exhausted (last page short), so the daily discovery made 0 calls on 22 and 23 Nov. Exhausted terms reset after 7 days, so the oldest come back from 23 Nov.

**Added (branch):**
- **Model-level terms** for the brands with the most published products and reported sales: Baseus 151, UGREEN 149, ESSAGER 136, Toocki 111, Vention 65, ROCKBROS 60, Ulanzi 43, Naturehike 41, QCY 33, 70mai 19.
  - Tech: `UGREEN cable/power bank/charger`, `Baseus cable`, `Baseus magnetic power bank`, `ESSAGER charger/cable`, `Toocki charger/cable`, `Vention cable/HDMI`, `Ulanzi tripod/light`, `Moondrop earphones`, `QCY smart watch`, `Haylou smart watch`, `CMF Buds`, `CMF Watch`, `Hagibis`, `Rocoren`.
  - Car: `70mai dash cam`, `DDPAI dash cam`, `Baseus car vacuum`, `ESSAGER car charger`.
  - Sport: `ROCKBROS cycling glasses/gloves`, `Naturehike tent/sleeping bag/chair`.
- **Brands and aliases** from rejected rows in brand-run stores (reason `brand`, more than 500 sales):

  | Change | Evidence |
  |---|---|
  | `cmf` alias for Nothing | 10 products above 500 sales from "Nothing Online Store" and "Nothing Flagship Store", titled "CMF Buds/Watch" |
  | Hagibis (new) | "Hagibis Official Store", 2 products above 500, max 3,480 |
  | Rocoren (new) | "Rocoren Official Store", 2 products above 500, max 3,100 |
  | `אולנזי` alias for Ulanzi | 2 products above 500 in "Ulanzi Official Store" with a Hebrew-only title |

- **Not added:** misspelled-title rows ("Ureen", "Pessager", "Tookki"): the title does not name the brand, so the rule correctly rejects them. eufy: its titles name Soundcore/Anker, and its own items have at most 38 sales.
- **Legacy path:** the no-database live build now uses the first 12 terms per category (`LEGACY_TERMS_PER_CATEGORY`). Production reads the database and searches every term.

**NOT VERIFIED:** yield. The new terms run on the first discovery after a merge (never-run terms go first, 40 calls per day).
