# Hebrew product data and strict Israel quality policy

## User requirements

Public products must have **more than 500 reported purchases**, **at least 4.7/5 verified stars**, at least one verified review from an Israeli buyer, verified shipping availability to Israel, and Hebrew product copy. These are independent requirements. A missing value is never treated as a pass. Exactly 500 purchases fails; exactly 4.7 stars passes. Fresh, attributable evidence is required, with a six-hour maximum age.

## Live checks performed on 14 November 2026

Nine bounded server-only requests were made in Preview using existing server credentials. No credentials were retrieved into chat/local files, no buyer identities/order IDs were logged, no retries were made, no paid translation provider was connected and no scheduled process was created. The temporary diagnostic build command has been removed; regular builds do not run the probe.

| Separate check | Observed result |
|---|---|
| Minimal baseline product search | Success, 10 products |
| `sort=LAST_VOLUME_DESC` only | Success, products with thousands of reported recent sales |
| `ship_to_country=IL` only | Success; country context accepted, no explicit delivery data returned |
| `target_language=HE` only | Success; actual Hebrew supplier titles returned |
| All three options combined | Success; Hebrew products with 10,609, 11,059 and 32,832 reported recent sales among the sampled results |
| Official social review query, buyer country IL | `InsufficientPermission` |
| Official social review query, all countries | `InsufficientPermission` |
| Product detail, baseline | `ApiCallLimit`; no retry |
| Product detail, `country=IL` | Success; one matching product returned, but no shipping cost/time or star-average fields |

Sanitized product-query evidence is saved in `aliexpress-quality-probe-2026-11-14.json`. The returned `evaluate_rate` values such as `98.0%` mean positive-feedback percentage. They are **not** a 4.9/5 rating and are never converted into stars. `lastest_volume` is recent reported sales, not a verified lifetime order ledger or a count of Israeli purchases.

## What now works

- All product queries request Hebrew from AliExpress, an Israel destination context and the tested recent-sales sort; supplier timestamps are cached with the results for six hours.
- Additional supplier images, shop name and positive-feedback percentage are retained when returned. No specifications, stock, delivery promises or star ratings are invented.
- Private discovery retains supplier candidates and clearly displays missing eligibility evidence. Temporary local approval/content export cannot publish to or bypass the public catalog; exported unqualified drafts carry a review-only warning.
- The public catalog, homepage imagery, search, category pages, product pages and `/go` all use the same server-side fail-closed selection. Missing Israeli reviews, a true star average or shipping verification blocks publication, including direct old product/redirect URLs.
- The existing working baseline was preserved in the explicit diagnostic script; previously problematic optional parameters were tested separately before being introduced into the application query. Currency was not changed or converted.

## Current limitation — no products can honestly pass all conditions yet

The account cannot read the official buyer-country review endpoint. The accessible affiliate responses provide positive-feedback percentages, not the requested star average, and do not provide sufficient delivery evidence for the strict policy. Therefore the latest public catalog intentionally shows **no verified eligible products**, rather than labeling unverified candidates as qualified. This does not mean AliExpress has no matching products.

`quality.ts` defines and tests the evidence contract. The affiliate normalizer deliberately leaves inaccessible quality evidence unknown; it does not accept similarly named arbitrary fields or client-side approval as proof. Runtime enrichment for currently unauthorized star/review/delivery sources has not been activated. The owner must obtain/confirm official API access and current field contracts before those adapters can be connected and real items admitted. Granting a permission alone does not magically populate the missing fields.

## Required owner/platform action

1. In the AliExpress developer application, request/verify access to `aliexpress.social.product.evaluation.query` with buyer `country_code=IL`. Both live review checks currently fail with `InsufficientPermission`.
2. Confirm an authorized official source for the actual product star average, review count and current country/variant-specific delivery availability. Positive-feedback percentages and a requested destination alone are insufficient.
3. Once access is granted, connect and test those evidence adapters against actual responses; keep the 4.7 and >500 policy unchanged. Do not bypass platform permissions or add an unofficial scraper.
4. Observe provider quotas: an `ApiCallLimit` was observed in a detail probe. Existing per-process application limits remain a guard, not an account-wide quota.

## Sources

- [Official product-query parameters and response fields](https://developer.alibaba.com/docs/doc.htm?articleId=45803&docType=2&treeId=674): Hebrew target language, country context, recent-sales sort and positive-feedback rate.
- [Official product detail](https://developer.alibaba.com/docs/api.htm?apiId=48595): country parameter and detail-response fields.
- [Official buyer evaluations](https://developer.alibaba.com/docs/api.htm?apiId=54478): buyer country filter, evaluation stars and review text. Documentation availability does not establish this application's entitlement.

The referenced Affiliate documentation section is historical/deprecated; live response checks above are therefore recorded separately from documented capabilities.

## Validation

30 unit tests passed, including threshold boundaries, unknown/foreign/stale evidence and percentage-versus-stars separation. TypeScript and production build passed. The browser suite verifies unqualified candidates stay out of public pages and `/go`, while remaining visible only in the authenticated review workflow. All changes are confined to the development branch; no database, production promotion or merge was performed.
