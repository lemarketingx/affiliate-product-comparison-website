# Actions on the Production database (audit log)

Each entry records what changed, why, who requested it, and through which path. Writes go only through the `dp_*` functions.

## 2026-11-17 · Unpublished product 1005009849771017 (owner request, item 4)
- **Verified not an original product before acting:**
  - The title starts with "חלקי" (spare parts) and lists models from two makers (Dreame and MOVA).
  - The store is "Roborock ECOVACS Dreame Vacuum Cleaner Parts Store Store": a parts store named after three manufacturers.
  - The provider brand field (`supplier_brand`) is empty.
- **Action:** `dp_set_unpublished({product_id, unpublished: true})`, the same function the admin screen uses. Logged with `dp_log_events` as `MANUAL_UNPUBLISH_NOT_ORIGINAL`.
- **Result:** status `unpublished`, `manual_unpublished = true`. Gone from `/deals` on Production; `/go/1005009849771017` answers 404.
- **Side effect:** the direct SQL path does not clear the server cache, whereas the admin screen does (`revalidateTag`). One check request, at 09:32:03 UTC, was served from the stale cache and redirected, writing **click row 3** (source `other`). After the cache refreshed, `/go` returned 404. **Lesson:** unpublish through `/admin/catalog`, not SQL.

## 2026-11-17 · Full affiliate link check, all 46 links (owner request, item 3)
- **Path:**
  - The links were read from the database (read-only).
  - Each link was followed from this session with the job's own code (`lib/aliexpress/link-check.ts`), paced at 0.9 s, without loading the product page.
  - Results were recorded as **run 14** (`link_check`, `manual`) through `dp_start_run`, `dp_record_link_checks` and `dp_finish_run`.
- **Result:** 46/46 `ok`.
  - One redirect each, to `www.aliexpress.com` with the **same product ID**.
  - Affiliate parameters present: `aff_fcid`, `aff_fsk`, `aff_platform`, `aff_trace_key`, `sk`, `terminal_id`, `afSmartRedirect` and `pdp_npi`.
  - All 45 published products now have `link_status = ok`.
- **Note:** following a promotion link may register as a click in the AliExpress affiliate portal. The daily job does the same for 8 links a day.

## 2026-11-17 · Test clicks in `dp_click_events`
| Row | Time (UTC) | Product | Source | Why |
|---|---|---|---|---|
| 2 | 07:24:40 | 1005010579452804 | `other` | Live purchase-path test (requested) |
| 3 | 09:32:03 | 1005009849771017 | `other` | Unintended: stale-cache redirect while checking the removal (above) |

Row 1 (2026-11-16, source `catalog`) predates these checks. Rows 2–3 are tests and should be excluded from click reports. Delete them only if the owner says so.

## Environment allowlist (this cloud environment only, owner-approved prompts)
- Production site and image CDN: `affiliate-product-comparison-websit.vercel.app`, `ae-pic-a1.aliexpress-media.com`.
- Link check: `s.click.aliexpress.com`, `star.aliexpress.com`, `www.aliexpress.com`, `he.aliexpress.com`.
- Name checks: `www.isoc.org.il` and `www.tmdn.org`. Both block automated access, so they produced no results.
