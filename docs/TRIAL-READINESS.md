# Trial launch readiness, 2026-11-17

**Scope:** business readiness for a limited trial launch.
- **Nothing merged to `main`.** Production code is unchanged.
- **Two owner-requested data actions on Production:** the parts listing was unpublished, and the full link check was recorded. Both are in `docs/CATALOG-ACTIONS.md`.

## Numbers (live database, 2026-11-17)
| Measure | Value | Evidence |
|---|---|---|
| Products stored | 1,715 | `dp_products` |
| **Valid published products** | **45** | All pass the rules. 0 duplicates. Every one has an ILS price checked within 48 h (oldest about 21 h), an image (46/46 load from the CDN), a Hebrew title and a verified brand |
| **Valid affiliate links** | **45 of 45 published** (46 of 46 checked) | Run 14: each link reaches the same product ID with affiliate parameters |
| Click tracking | Works | Product page → `/go` (307 to the stored link; visitor URLs ignored) → a row in `dp_click_events` within 3 s. All 45 product pages send the purchase button through `/go` with `rel="sponsored"` |
| Categories with products | tech 30 · sport 12 · car 3 · **home 0** (hidden on the branch) | Real rows run locally on the branch |
| Revenue / conversions | **Unknown** | No provider-verified order report has been read. Clicks are not sales |

## Performance
| Where | Result | Status |
|---|---|---|
| Production (`main`, old design), live, real images | Mobile LCP 1.26–2.20 s (TTFB 0.19–0.49 s), CLS up to 0.26 on search, about 1 MB per page, full-size images, 10–16 contrast violations on home | **Measured live** |
| Branch (new design), local server, real rows and real images | axe 0 violations; CLS ≤ 0.042; image weight −71% (thumbnails, 120/120 load); mobile LCP 1.46–1.73 s | **Local only.** The server is uncompressed HTTP/1.1, so LCP is not comparable to Production |
| **Branch on Preview** | Not run | **BLOCKED: waiting for the Preview link from the owner.** The Vercel connector has no access to this project |

## Done this round (branch)
- **Empty categories hidden** from tabs, the category page, home banners and carousel. An empty category URL shows "page not found" with `noindex`. The status is 200 rather than 404 because of streaming, a known Next.js behaviour.
- **Final-price note on the product page:** "המחיר הסופי נקבע בקופה של AliExpress. ייתכנו דמי משלוח, תוספת לדגם או לצבע אחר, ושינוי מחיר מאז הבדיקה."
  - The card adds "· סופי בקופה" to the check-time line.
  - The exact check time was already in the price label.
  - No promise beyond what the data shows.
- **Data-backed catalog expansion** (`docs/CATALOG-EXPANSION.md`): the brand Toocki, and 12 model-level terms for brands whose official stores already pass. It takes effect only after a merge.
- **Five coined name proposals** (`docs/BRAND-NAMING.md`, round 4). No final name was chosen.
- **Tests:** unit 121/121 · e2e 44/44 · typecheck and build OK.

## Open issues
| # | Issue | Impact | Who |
|---|---|---|---|
| 1 | Preview performance not measured | LCP of the new design unknown | Owner sends the Preview link |
| 2 | Catalog growth stalled: all terms exhausted on Production until about 2026-11-23; the new terms need a merge | 45 products, 3 categories | Merge approval |
| 3 | Name and trademark: `.co.il` and ILPO NOT CHECKED (blocked here) | Brand cannot be launched publicly under a new name | Owner (manual checks) |
| 4 | Price refresh has no slack: one missed daily run pushes prices past 48 h (then hidden) | Catalog could go priceless for a day | Consider a second daily window |
| 5 | Unpublishing by SQL leaves a stale cached redirect for up to one request | Use `/admin/catalog`, which clears the cache | Process |
| 6 | Test click rows 2–3 in the click table | Inflates click count by 2 | Exclude or delete on owner's word |
| 7 | The no-DB fallback path builds slowly with more terms (about 65 s cold) | Local or fallback only; Production uses the DB | Low |
| 8 | Availability, stock and checkout price per variant | NOT VERIFIED; the site makes no claim | – |

## Assessment
**Ready for a limited, invite-only trial on Production as it is today (`main`):**
- prices are verified and fresh;
- 45/45 links are verified;
- click tracking works;
- the invalid listing is removed.

**The branch is better for a trial**, with its accessibility, image weight, honest categories and the final-price note. But it must not go live until the owner:
- (a) sends the Preview link and the LCP check passes;
- (b) approves the merge.

**Not ready for a public, branded launch:** the name is not chosen, and trademark and `.co.il` are unverified.
