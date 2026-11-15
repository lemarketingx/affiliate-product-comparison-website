# Brand storefront ("Originals")

The public site shows **only known brands, and only products sold by a shop whose
name identifies the brand's official store** (brand name + "Official"). Everything
else returned by the API is dropped before it reaches the page.

## Owner tasks

1. **Verify each official store** on AliExpress by hand. Then set
   `storeVerified: true` for that brand in `lib/dealpilot/brands.ts`. Until then the
   site says "חנות רשמית לפי שם החנות" (matched by name), never "verified".
2. **Add or remove brands** in `lib/dealpilot/brands.ts` (`term` is the API search
   keyword, `storeMatch` the lowercase name fragments of the official shop). Do not
   add logos; brand names are used only to identify products.
3. **Israeli price comparison** appears only for products listed in
   `lib/dealpilot/israel-prices.ts`, entered by hand with store, link and check date.
   Entries older than 30 days are hidden. No scraping, no estimates.
4. **Update channel** (optional): set `DEALPILOT_WHATSAPP_URL` and/or
   `DEALPILOT_TELEGRAM_URL` in Vercel to show the "join the channel" block.

## Quota

The brand catalog now attempts **up to two pages × 50 provider candidates per brand** (up to 100 candidates each, 12 brands). A cold build can use up to 24 provider calls and is subject to the existing in-process 24 calls/hour guard, alongside admin queries. All results are cached for six hours.

**100 sellable products per brand is not guaranteed.** AliExpress may return fewer than 100 unique products, or fewer products from the correctly named store, or incomplete data. Never backfill with generic products or claim a brand has 100 items unless 100 passed the actual quality/store filter.

The Affiliate API used here does **not** reliably report warranty duration, provider, service country or service address. Never infer these from the brand name or "Official Store" text. Product-level manually verified terms may be entered into `lib/dealpilot/product-warranty.ts` with source URL and check date; otherwise show explicit unknown fields and link to warranty guidance.

## Market layout (v2)

- **Categories** are cross-brand shelves in `lib/dealpilot/shelves.ts`; a product
  gets the first shelf whose keywords appear in its title. Edit keywords there.
- **Discount badges** use only the provider's `target_original_price` in the same
  currency and higher than the sale price. No discount is ever computed from a guess.
- **Brand chips** use the brand name in the site font plus an accent colour
  (`accent` in brands.ts). Never add real logos.
- **Favorites** are stored only in the visitor's browser (localStorage).
