# Name research, round 4 (2026-11-17): coined names

**Status: proposal only. The owner asked that no final name be chosen yet.** The live name stays DealPilot (`lib/brand.ts`).

## What was and was not verified
| Check | Source | Status |
|---|---|---|
| Global domains (`.com`, `.app`, `.shop`) | Vercel registry lookup. Calibrated: a random `.com` shows as free, known names as taken | **Checked** |
| `.co.il` | ISOC-IL WHOIS (`www.isoc.org.il`) | **NOT CHECKED.** A Cloudflare bot check blocks automated access, including a real browser. Not bypassed. The Vercel tool's `.co.il` answers are unreliable (round 3) |
| Israeli trademarks | Israel Patent Office search; TMview (`www.tmdn.org`) | **NOT CHECKED.** The ILPO host does not resolve here; TMview rejects automated requests ("Request Rejected") |
| Existing uses | Web search, extended mode, exact name in Hebrew and Latin plus category words (the query shape that found "מחיר אמת") | **Checked** (search coverage only; absence of results is not proof of absence) |

## The five proposals
| Name | Idea | Uses found | `.com` | `.app` | `.shop` | `.co.il` | Main risk |
|---|---|---|---|---|---|---|---|
| **שורית** (Shurit) | "a little line": the bottom line, which matches the design | None found as a brand, shop or app | ✅ free | ✅ free | – | NOT CHECKED | Could read as a given name; meaning needs a tagline |
| **בדוקלי** (Bdukli) | "checked for me": the verification promise | None. Nearby: "Badooks / בדוק", an Israeli service-search site; "בדוקאי" is a police term | ✅ free | ✅ free | – | NOT CHECKED | Some sound overlap with Badooks |
| **תגלי** (Tagli) | "you'll discover", with "tag" (price tag) inside | None as a brand; it is an ordinary verb form | ❌ | ❌ | ✅ free | NOT CHECKED | Main domains taken; a verb is weak as a mark |
| **זולית** (Zolit) | "a cheap one" | None found | ❌ | ✅ free | – | NOT CHECKED | "Cheap" fits poorly with branded originals; may undercut trust |
| **מחירלי** (Mechirli) | "the price for me" | A GitHub project "mehirli-app": a quotes marketplace for services (another category, in development) | ✅ free | ✅ free | – | NOT CHECKED | A same-sounding Israeli project exists |

Checked and dropped this round:
- **קנלי / Kneli:** "קנה לי" (`kneli.co.il`) is an Israeli shopping and price-comparison site, the same category.
- **Pricli:** "Pricly – AI Price Finder" is a same-category app.
- **נטולי / Netoli:** confusable with Netaly (gifts) and "נטלי" (a medical alert service).
- **תכלי / Tachli:** too close to the rejected תכל'ס / tachlis.co.il.
- **Shuraly / שורלי:** a possible insurance-comparison mention (round 3).

## Suggested next step (owner)
If one is preferred, check **שורית** and **בדוקלי** first: they have free `.com` and `.app` and no use was found.
- Run the ISOC WHOIS for `.co.il` by hand.
- Search ILPO in classes 35, 42 and 9.
- Get an attorney's opinion.
- Buy the domains before any public mention.

Sources:
- https://kneli.co.il/about/
- https://apps.apple.com/us/app/pricly-ai-price-finder/id6757987802
- https://github.com/amirok196888-cloud/mehirli-app
- https://www.badooks.com/
- https://netaly.co.il/

---

# Name research, round 3 (2026-11-17)

**Status: proposal only.**
- The live name stays DealPilot. It lives only in `lib/brand.ts`, so a change is one edit plus the wordmark.
- No domain was bought or reserved.
- **No name here is presented as legally available.** Israeli trademarks: NOT CHECKED (see Method).

## Why round 2 is withdrawn
- **The owner found existing uses of "מחיר אמת" in price comparison.** Round 2 reported "no site or brand found", so the method failed, not only the name. One use is confirmed here: a deals site called "מחיר אמת" that checks each deal against price history and other stores, which is our exact category (https://gregokrol.github.io/Web_Scraping/). A search result also lists an English app, "Truthful Price" (https://apps.apple.com/ec/app/truthful-price/id803920985); its page was not opened.
- **What round 2 missed:** it searched the phrase alone. The phrase together with the category ("השוואת מחירים", "מחירים", "אפליקציה"), in Hebrew and transliteration, finds it.
- **The `.co.il` domain results in round 2 were wrong.** Re-checked today, the same tool answers "taken" for every `.co.il`, including a random 22-character name that cannot be registered (`qzv7k2dealtest-xx91.co.il`). Yesterday it answered "free" for some. Its `.co.il` answers are unreliable either way, so every `.co.il` below is **NOT CHECKED**. Its global TLD answers behave correctly (the same random `.com` shows as free).
- **Descriptive "מחיר X" phrases are dropped.** They are common in consumer writing, others use them, and they are hard to own. This round prefers coined or single-word names.

## Method (round 3): the queries actually run
- **Web search, exact phrase plus category, extended mode.** This is the query shape that found "מחיר אמת":
  - `"תחתית" השוואת מחירים`
  - `"סופית" השוואת מחירים`
  - `"שורלי" OR "קבלית" OR "נקוב" השוואת מחירים אתר`
- **Transliteration and domains, extended mode:** `Tachtit OR tachtit.com OR Sofit.co.il OR sofit.com shopping deals prices`
- **Standard-mode searches, one per name, with category words:**
  - `"שורלי" OR "Shurly" אתר קניות מחירים`
  - `"קבלית" OR "Kablit" אתר אפליקציה`
  - `"שקלית" OR "Shiklit" ...`
  - `"תחתית" OR "Tachtit" מותג אתר קניות`
  - `"נקוב" OR "Nakuv" ...`
  - `"סופית" השוואת מחירים OR "Sofit" app Israel shopping`
  - `"מחיר נקי" השוואת מחירים אתר`
- **App stores:** only what web search returned (App Store and Shopify listings). The stores were not searched directly.
- **Not opened:** the "Truthful Price" App Store page; it was seen only as a search result. **Only one of the two "מחיר אמת" uses the owner mentioned is confirmed here. Which was the second?**
- **Domains:** global TLDs were checked with the Vercel registry lookup. `.co.il` is NOT CHECKED: the tool is unreliable for it (above).
- **Trademarks and `.co.il` WHOIS: NOT CHECKED.** The Israel Patent Office search, ISOC-IL WHOIS, WIPO Global Brand Database and TMview are outside this environment's network allowlist, and a fetch attempt failed on that. They were not attempted in any other way (for example, by asking to allow those hosts).

  Owner steps, about 10 minutes per name:
  1. Search https://trademarks.justice.gov.il for the Hebrew word and the transliteration, in classes 35, 42 and 9.
  2. Check `.co.il` at https://www.isoc.org.il (WHOIS).
  3. Have a trademark attorney confirm the final choice before buying a domain.
- **Score (1–5 each):**
  - *Differentiation:* says the promise and can be owned.
  - *Israeli fit:* natural Hebrew, no awkward meaning.
  - *Memorability:* easy to remember and spell.
  - *SEO:* own-name search clarity plus free domains, minus a generic word.

## The five names
| Rank | Name | Meaning / idea | Uses found | Domains (2026-11-17) | Diff. | Fit | Memo. | SEO | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **סופית** (Sofit) | "final", as in the final price: the product's promise in one word | No Israeli shopping or price use. Abroad: "Sofit" is an Indian soy and almond drink brand (food, a different class). Distant echo of SoFi (US fintech) | `.com` ❌ · `.app` ❌ · `.shop` ❌ · `.co.il` NOT CHECKED | 4 | 4 | 5 | 2 | **15** |
| 2 | **תחתית** (Tachtit) | "the bottom": the "bottom line" design direction | No shopping or price brand. "Cafe Tachtit", a Tel Aviv café. **SEO/UX risk:** "תחתית" is also a product type on Zap and CHP (coasters, pool-floor mats), so searches and on-site search would mix in those products | `.com` ❌ · `.app` ✅ · `.shop` ✅ · `.co.il` NOT CHECKED | 4 | 5 | 5 | 1 | **15** |
| 3 | **קבלית** (Kablit) | Coined from קבלה ("receipt"), matching the receipt-style price box | Nothing found. **Risk:** it is also the adjective "kabbalistic" | `.com` ✅ · `.app` ✅ · `.shop` ✅ · `.co.il` NOT CHECKED | 3 | 2 | 4 | 3 | **12** |
| 4 | **נקוב** (Nakuv) | "stated", as in "המחיר הנקוב" | No brand. **Risk:** it means the *list* price, the opposite of the promise. Also an insurance term ("נהג נקוב") | `.com` ❌ · `.app` ✅ · `.shop` ✅ · `.co.il` NOT CHECKED | 2 | 4 | 4 | 2 | **12** |
| 5 | **שורלי** (Shurly) | Coined: שורה ("line") + "-li", and it sounds like "surely" | **Possible same-category use:** a reader comment on icar recommends "אתר שורלי" for the cheapest insurance price (https://www.icar.co.il/magazine4.24/bksv2krlr/). `.com` and `.app` are registered | `.com` ❌ · `.app` ❌ · `.shop` ✅ · `.co.il` NOT CHECKED | 2 | 3 | 4 | 1 | **10** |

Dropped this round:
- **מחיר אמת:** an existing same-category use.
- **מחיר נקי:** a descriptive phrase that can't be owned. `mechirnaki.com` is free, but the phrase is in everyday use.
- **שקלית:** "Shikli", an Israeli budgeting app with a near-identical sound (https://apps.apple.com/us/app/-/id6753592336).
- **שורה תחתונה:** the phrase is saturated (round 2).

## Recommendation
**No name is ready to approve, and none is a strong winner.**

If the owner wants a candidate for the trademark and `.co.il` check now, take **סופית** first.
- It states the promise (the final price).
- No Israeli shopping use was found.
- It does not collide with a product type.
- **Risks:** all global domains are taken, so the site would rely on `.co.il` (unknown). There is a distant SoFi echo, and a food brand abroad.

**תחתית** is the alternative. It fits the design best, but the word is also a product category on Israeli shopping sites.

**The better long-term route is a coined name** with the domain secured first. The owner can choose this instead of either word; I can generate and check a coined shortlist on request.

---

# Round 2 (2026-11-16): WITHDRAWN
The recommendation below (מחיר אמת) is withdrawn: same-category uses exist, and the `.co.il` results were unreliable. It is kept for the record only.


**Status: proposal only.**
- The live name stays DealPilot until the owner approves a change.
- No domain was bought or reserved.
- The name lives in `lib/brand.ts` (one place) and the wordmark is swappable.

## Round 1, closed
- **תכל'ס / Tachles:** the owner rejected it. An active Israeli price-comparison and affiliate site, "תאכלס" (tachlis.co.il), exists, so the risk of brand confusion is real.
- **DealPilot:** a same-category "DealPilot" coupon app exists, and all of its main domains are taken.
- **שקוף:** rejected, because Shakuf is an Israeli news nonprofit.

## Method
- **Domains:** checked live with the Vercel domain-registry tool, a read-only lookup. Lookups covered `.co.il` as well as global TLDs; the results are below.
- **Competitors and use:** web search in Hebrew and English.
- **Israeli trademarks: NOT CHECKED.** The ILPO search host (`trademarks.justice.gov.il`) does not resolve from this environment, and `gov.il/he/service/trademark-search` returned HTTP 403 to automated access. **No name below is presented as legally available.**

  How the owner checks, about 10 minutes per name:
  1. Open the Israel Patent Office trademark search (https://trademarks.justice.gov.il) in a browser.
  2. Search each exact Hebrew name and its transliteration.
  3. Look at classes **35** (online retail and advertising services) and **42** (online platforms). Also check **9** (apps).
  4. Note any live mark or pending application.

  A trademark attorney should confirm the final choice before any domain purchase or launch.
- **Score (1–5):**
  - *Differentiation:* how well it says the product's promise and stands apart.
  - *Israeli fit:* natural Hebrew, no translation needed.
  - *Memorability:* easy to remember and to spell in Hebrew.
  - *SEO:* search demand for the words, plus a free `.co.il` domain, minus competition for a generic phrase.

## The five names
| Rank | Name | Meaning | Domains (live check 2026-11-16) | Competitors / uses found | Differentiation | Israeli fit | Memorability | SEO | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **מחיר אמת** (Mechir Emet) | "the true price": the vision's *True Price* idea in two plain words | `mechiremet.co.il` ✅ · `mechiremet.com` ✅ · `.shop` ✅ · `.app` ✅ | No site or brand by this name found. Common phrase in consumer writing | 4 | 5 | 5 | 5 | **19** |
| 2 | **סופית** (Sofit) | "final", as in "the final price"; also "finally" | `sofit.co.il` ✅ · `sofit.app` ❌ · `sofit.shop` ❌ · `getsofit.com` ❌ | No Israeli commerce use found. Distant echo of SoFi (US fintech). The Hebrew "אותיות סופיות" sense is harmless | 4 | 4 | 5 | 3 | **16** |
| 3 | **בדקתי** (Badakti) | "I checked": the shopper's own voice | `badakti.co.il` ❌ · `badakti.com` ❌ · `badakti.shop` ✅ · `badakti.app` ✅ | No site found by search, but both main domains are registered by someone (use unknown) | 4 | 5 | 5 | 2 | **16** |
| 4 | **מחיר נקי** (Mechir Naki) | "a clean / net price": no gimmicks, nothing hidden | `mechirnaki.co.il` ✅ · `mechirnaki.com` ✅ | None found | 3 | 4 | 4 | 4 | **15** |
| 5 | **שורה תחתונה** (Shura Tachtona) | "the bottom line": matches the approved design language | `shuratachtona.co.il` ✅ · `shuratachtona.com` ✅ · `shura.deals` ✅ | No brand found. The phrase is everywhere as an article heading, so search competition is heavy and distinctiveness low | 3 | 5 | 4 | 2 | **14** |

Rejected in this round:
- **כמה זה:** an existing telecom comparison service, "כמה זה עולה", and `kamaze.co.il`/`.com` are taken.
- **תגית / פתק / תווית:** `.co.il` taken (all three), plus other main TLDs for each.
- **סגרתי:** `.co.il` and `.com` taken.
- **בדוק:** `.co.il` taken.

## Recommendation
**מחיר אמת** as the leading candidate, subject to the owner's trademark check.
- It states the product's promise exactly: the true, final price. That is the product's differentiation.
- It is instantly clear to every Israeli shopper.
- It is easy to spell.
- It carries the word "מחיר", the core search term of the category.
- All four domains, `.co.il` included, are free today.

**Honest risk:** a descriptive phrase is harder to register and defend as a trademark. The usual mitigation is to register the logo plus the wordmark together. The tag-and-bottom-line symbol is distinctive, which helps. A trademark attorney should weigh this.

**Backup: סופית.** It is shorter and more ownable as a mark, and `sofit.co.il` is free, but its secondary TLDs are taken.

The symbol (a price tag, a bottom-line bar and a check) fits every name on the list, so no logo work is lost whichever name is chosen.

## Sources
- Israeli price-comparison landscape, including "כמה זה עולה" (telecom): https://www.ice.co.il/consumerism/news/article/1055097 · https://www.zap.co.il/news.aspx?nid=3324 · https://www.globes.co.il/news/%D7%94%D7%A9%D7%95%D7%95%D7%90%D7%AA_%D7%9E%D7%97%D7%99%D7%A8%D7%99%D7%9D.tag
- "השורה התחתונה" as a common consumer-writing phrase: https://www.ice.co.il/consumerism/news/article/1119938 · https://www.maariv.co.il/economy/consumerism/article-1351201
- Pricez and others (no "סופית" or "מחיר נקי" site found): https://apps.apple.com/il/app/pricez/id475190969
- Round 1 sources: Shakuf https://shakuf.co.il/english · DealPilot app https://www.getdrio.com/app-tracker/dealpilot
