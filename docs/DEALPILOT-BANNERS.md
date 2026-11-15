# Official AliExpress banners and campaigns

## What exists, and what does not

- **No API returns Portals banner images.** The creatives in AliExpress Portals (Promotion → Banners/Creatives) are downloaded manually. They go into `lib/aliexpress/banner-config.ts` (`PORTAL_BANNERS`), with the unmodified file in `public/banners/` and the title, landing page and dates copied exactly as Portals shows them. The list starts empty. The site never crops, overlays or edits the image: it is shown with `object-fit: contain`, and the title, dates and disclosure sit outside it.
- **`aliexpress.affiliate.featuredpromo.get`** returns featured campaigns (name, description, product count and, where provided, start and end time). It does not return banner images. For each active campaign the site calls `aliexpress.affiliate.featuredpromo.products.get` (`page_size=1`) and uses the top product's official image and product URL as the banner image and destination.
- Field names come from third-party SDK descriptions, because the official docs could not be read from this environment. The parser is tolerant: anything missing stays "לא דווח". The admin screen lists the field names the live API actually returned, so the parser can be checked against them.

## Link generation and publishing gate

For every active banner the server calls `aliexpress.affiliate.link.generate` once per batch, with `promotion_link_type=0`, `source_values` and `tracking_id=ALIEXPRESS_TRACKING_ID` (a server environment variable). A banner is **published only if**:

1. the provider returned a link for exactly that source URL;
2. the link is https on `s.click.aliexpress.com` or another AliExpress host, and is not the source URL itself;
3. the provider echoed back a `tracking_id` equal to the configured one.

A missing tracking id, a permission error, a wrong or missing echoed id, or no valid link all block the banner, and the reason is shown in the admin screen. Expired campaigns are removed at render time, upcoming ones are not shown yet, and if no campaign remains the homepage shows regular category banners (internal links, no affiliate wording). Public clicks go through `/go/b/<id>`, which resolves server-side: visitor input never sets the destination, and expired or blocked banners return 404.

## link.generate: diagnosis and fix (2026-11-15)

The live Preview reported `featuredpromo.get` → 135 campaigns, 0 banners published, and 6 link generations failing with `PROVIDER_RESULT_402_INVALID_PARAMETER`. The official parameter page could not be read from this environment, because `openservice.aliexpress.com` and `developers.aliexpress.com` are blocked here. What changed:

- **Canonical sources.** The product URLs returned by `featuredpromo.products.get`, when requested with `target_language=HE`, can be localised (for example `he.aliexpress.com`) and carry query parameters. Every source is now reduced to `https://www.aliexpress.com/item/<id>.html`. Non-product AliExpress pages keep host and path only.
- **One call per source.** Previously the 6 sources were joined into a single `source_values`, so one rejected URL failed all 6. Now each source is generated separately, at most 3 in parallel.
- **Parameters sent.** Only `promotion_link_type=0`, `source_values` and `tracking_id`, plus the signed system parameters. Product search requests are unchanged.
- **Safe diagnostics.** The provider's `resp_msg`, or the `msg`/`sub_code`/`sub_msg` of `error_response`, is kept after removing URLs, the tracking id, keys and long tokens (at most 200 characters). It is shown on `/catalog-status` and in admin. Generated links are masked everywhere (`s.click.aliexpress.com/e/_D…`).
- **Admin probe.** `/admin/banners` → "אבחון link.generate". It makes up to 5 calls, each changing one thing against a baseline:
  - A: canonical URL + `tracking_id` + type 0;
  - B: without `promotion_link_type`;
  - C: type 2;
  - D: without `tracking_id`, for diagnosis only and never published;
  - E: the original non-canonical URL.

  For each call it shows the result code, the sanitised message, a masked link, and whether the tracking id was echoed.

If A still fails while D succeeds, the problem is the tracking id value or its approval in Portals. If A succeeds and E fails, canonicalisation was the fix.

## Verification levels (reported separately)

1. **Link generated and tracking id echoed.** Automatic, on every refresh (hourly cache).
2. **Redirect check.** Admin → "באנרים וקמפיינים" → "בדיקת הפניות". This follows each published link manually (at most 6 hops, AliExpress domains only) and records the chain. The target is at least 3 OK. A single 200 from `s.click.aliexpress.com` is reported as "needs manual check", because the redirect may happen in the browser.
3. **Commission attribution.** This can only be confirmed in AliExpress Portals reports: clicks or orders under the tracking id. The owner records it in `ATTRIBUTION` (`confirmed`, `checkedAt`, `how`). Until then the public disclosure says "ייחוס העמלה בחשבון השותפים טרם אומת", and the admin screen says "טרם אומת". A working redirect is not proof of attribution.

## Not done from this environment

There are no AliExpress credentials here, and the network blocks `s.click.aliexpress.com` and `vercel.app`. So the live account was **not** queried, no real link was generated, and no real redirect was verified. The e2e suite exercises the full flow against a TEST FIXTURE API (port 3104): 5 campaigns, of which 1 has expired and 1 has no valid link, so 3 are published, and 3 out of 3 simulated redirects pass. Those are fixture results, not live ones.

## Owner checklist

1. Set `ALIEXPRESS_TRACKING_ID` in Vercel (Preview and Production). If the account has several tracking ids, use the one meant for the site.
2. Open the Preview at `/admin/banners`. Check API status, the campaigns returned, the fields seen and the error codes. If `link.generate` returns a permission error, request access in the AliExpress open platform console.
3. Click "בדיקת הפניות". At least 3 links should be OK.
4. Click a published banner yourself, then check Portals reports for the click under the tracking id. Record it in `ATTRIBUTION`.
5. Optional: add official Portals creatives to `PORTAL_BANNERS` (unmodified files, exact dates), and follow the program's terms of use for creatives.
