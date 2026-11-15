# DealPilot pre-flight engine: from catalog to buying autopilot

Branch `feat/dealpilot-missions` (from `design/dealpilot-preflight`). Nothing is merged or deployed.

## The idea

The camera story (a recorder that arrives without a hard disk) is one example of five problems an Israeli buyer has on AliExpress. The site now answers all five, for any product type, with one reusable engine:

| Problem | Solution on the site | Flight-language name |
|---|---|---|
| Does not know what to search for | Hebrew need → English search phrases that work, plus click-to-explain terms | "מתורגמן המגדל" (search lexicon) + `Term` chips |
| Does not know what is not in the box | Equipment manifest per need, with each item tagged as usually in box / not in box, required / recommended / optional | "מניפסט ציוד" |
| Does not know the real saving | Landed cost: price + shipping + required accessories + import tax (only if officially verified) vs. a sourced Israeli price | "עלות נחיתה" |
| Does not know if it fits Israel | Israel checks from traits (mains, cellular, WiFi, lithium, app…), each with a source or "נדרש אימות" | "מתאים לישראל?" |
| Does not know when not to buy abroad | Honest "buy in Israel" advice per type and per trait; safety gear is flagged | "מתי עדיף לקנות בישראל" |

### Why it scales: traits

Knowledge is written once per **trait** (for example "plugs into mains", "has a lithium battery", "needs a SIM", "records to storage", "has sizes", "safety product") and composed into **product types**. A new product type is about 40 lines that list its traits plus its specific items. The same traits power the per-product briefing on every product page.

## Where it lives

- `lib/preflight/`
  - `types.ts`: data model (`Claim`, `ManifestItem`, `Question`, `Trait`, `ProductType`).
  - `traits.ts`, `product-types.ts` (14 destinations), `glossary.ts`, `guides.ts`.
  - `plan.ts`: composes a plan from a type plus answers (answers can hide, require or mark items as owned, add traits, and reorder search phrases). Answers are encoded in the URL, so plans can be shared without storing anything.
  - `match.ts` + `text.ts`: free-text Hebrew matching (prefixes, final letters, synonyms). No AI.
  - `detect.ts`: conservative product-type detection from supplier titles. Exclusions win, a tie returns nothing, and the matched words are shown to the visitor.
  - `storage-calc.ts`, `powerbank-calc.ts`, `landed-cost.ts`: pure calculators that show their assumptions.
  - `import-tax.ts`: **the single tax configuration** (see below).
  - `israel-prices.ts`: owner-entered Israeli prices only (empty).
  - `approvals.ts`: publication gate.
- `app/_preflight/`: UI components (manifest, claims, terms, lexicon, briefing, calculators, autopilot wizard, product briefing).
- Routes: `/autopilot`, `/missions`, `/missions/[slug]`, `/guides/[slug]`. The homepage has an autopilot band, and product pages have the "מה כנראה לא בקופסה" block plus landed cost.

## Rules kept

- No invented prices, ratings, reviews, sales counts, savings or urgency. The calculator says "פער משוער", never "חיסכון".
- Every claim is typed: `source` (URL + check date), `general: true` (stable general knowledge), or `needsVerification: true`. The UI renders "נדרש אימות" next to each unverified claim. A unit test fails if a "general" claim contains a price, rate or currency figure.
- `quality.ts`, `/go`, admin and security code are unchanged. Mission products come from the existing catalog via `getCatalog()` and are only *labelled* by detection, so `/go` needed no change and no extra API quota is used.
- Search buttons are plain `aliexpress.com/w/wholesale-…` links, labelled "לא קישורי שותפים". The approved API used here returns promotion links for products only. Affiliate search links need `aliexpress.affiliate.link.generate` access to be verified first.
- No scraping. No server storage of wizard answers: copy, WhatsApp and the URL carry the plan.

## Import tax: not verified, so not computed

`gov.il` and Kol Zchut could not be reached from the build environment (network policy), so the VAT threshold and rate were **not** verified against an official source. `IMPORT_TAX.verified` is `false`, all values are `null`, and the calculator shows the tax line as "לא חושב" with the reason. Press reports (Bizportal and mako, read 2026-11-15) say the threshold returned to $75 in 2026 after temporary increases. They are shown only behind "למה המס לא חושב?" with a "נדרש אימות" label.

To activate: read the official Israel Tax Authority page, then set `verified: true`, `officialSource`, `vatExemptionUsd`, `vatRate`, `customsThresholdUsd`, `shippingIncluded` and `checkedAt` in `lib/preflight/import-tax.ts`. When verified, the calculator asks the visitor for a USD rate, because the threshold is in dollars and the site never fixes an exchange rate. Customs above the customs threshold is product-specific and stays "לא חושב".

## Owner actions

1. **Content approved.** The owner approved all destinations and guides on 2026-11-15 (`lib/preflight/approvals.ts`). They render in production builds. New destinations stay drafts until added there.
2. **Israeli prices.** Add rows to `ISRAEL_PRICES` (store, exact item, price in ₪, https link, date checked). Invalid rows are ignored. Without a row no gap is shown, unless the visitor types a price they saw.
3. **Verify "נדרש אימות" claims** (list below) and either attach a source or keep the label.
4. **Tax config** as described above.

### Claims marked "נדרש אימות"

- Israeli standards for electrical products and adapters in personal import.
- Shipping restrictions for lithium batteries to Israel.
- Ministry of Communications rules for personal import of WiFi, Bluetooth and cellular devices.
- LTE bands used in Israel, and the 2G/3G shutdown status.
- Standards for toys (small parts, coin cells) and safety gear (helmets, car seats).
- Size and shipping tax effects for bulky items above the threshold.
- Airline power-bank limits (Wh).
- Dash-cam footage as evidence and privacy.
- Phone-use-while-driving rules.
- Consumer-protection duties of foreign sellers.
- That splitting orders to avoid tax may be an offence.
- The current VAT threshold (press reports only).

The plug and voltage facts cite WorldStandards, a secondary source, read 2026-11-15.

## Proposed next steps (not implemented)

- **Affiliate search links**: verify `link.generate` entitlement, then wrap search URLs server-side and switch the label.
- **Optional AI step (proposal only)**: map free text to a product type and draft new product types for owner review. The output would go into the same typed, approval-gated files. It would never be shown live without review, and it needs a cost decision first.
- More destinations from real visitor queries (log nothing personal; review the search terms owners see in AliExpress reports).
- Product-type detection review in the admin, so the owner can confirm or override the automatic label per product.

## QA

- `npm run typecheck`, `npm test` (49 unit tests: storage, power-bank and landed-cost calculators with edge cases and missing data, content integrity, matching, detection, plan composition, URL sharing, approval gate, Israeli price validation), `npm run build` and `npm run test:e2e` (20 tests, including autopilot keyboard flow, destination page, product briefing on an isolated typed fixture server on port 3103, and no horizontal scroll at 304/375/768/1440) pass.
- On Linux without the pinned Playwright browser, run e2e with `DEALPILOT_CHROMIUM_PATH=/path/to/chromium npm run test:e2e`.
- Screenshots (fixture data, drafts enabled): `docs/screenshots/preflight/` contains a destination page, an autopilot plan and a product page, each in desktop (1440) and mobile (375).
