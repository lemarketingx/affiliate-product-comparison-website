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

The brand catalog makes one API query per brand (12), cached for six hours. The
admin discovery catalog still uses the category queries. Both share the in-process
guard of 24 product queries per hour; adding many brands needs a larger guard or
a scheduled refresh.
