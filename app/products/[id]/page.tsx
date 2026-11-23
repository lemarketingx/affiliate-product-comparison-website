import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { validAffiliateUrl } from "../../../lib/aliexpress/catalog-build";
import { identifyListedBrand } from "../../../lib/dealpilot/brands";
import { formatMoney } from "../../../lib/dealpilot/urls";
import { PublicShell } from "../../public-shell";
import { BRAND } from "../../../lib/brand";
import { ProductCard } from "../../product-card";
import { evaluateEligibility } from "../../../lib/aliexpress/quality";
import ProductGallery from "../../product-gallery";
import { getUsdRate } from "../../../lib/dealpilot/fx";
import { TaxBadge } from "../../tax-badge";
import ProductCostCalculator from "../../product-cost-calculator";
import { IMPORT_TAX } from "../../../lib/preflight/import-tax";
import { estimateIsraelTotal } from "../../../lib/preflight/tax-estimate";
import { freshnessLabel, priceAgeHours, priceHistorySeries, PRICE_WARN_AGE_HOURS } from "../../../lib/catalog-store/price-view";
import { storedPriceHistory } from "../../../lib/catalog-store/server";
import { PriceHistoryChart } from "../../price-history";
import { breadcrumbJsonLd, jsonLdString, productJsonLd } from "../../../lib/seo/structured-data";
import { siteOrigin } from "../../../lib/site-url";
import { safeSource } from "../../../lib/dealpilot/tracking";
import BrandLogo from "../../brand-logo";
import { BrandCompare, brandCompareRows } from "../../brand-compare";
import { ArrowUpLeft, ShieldCheck, Receipt, Clock } from "lucide-react";
import { productDisplayTitle } from "../../../lib/dealpilot/product-titles";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getCatalog()).items.find((p) => p.id === id);
  const title = p ? productDisplayTitle(p.title, identifyListedBrand(p)?.name ?? null) : null;
  return {
    title: title ? title + " | מחיר והיסטוריית בדיקות | " + BRAND.name : "המוצר אינו זמין | " + BRAND.name,
    description: title ? `בדקו את ${title}: מחיר מדווח מ־AliExpress, מועד בדיקה, היסטוריית מחירים אם זמינה והערכת עלויות יבוא לישראל. המחיר הסופי נקבע בקופה.` : "המוצר אינו מופיע כרגע בקטלוג.",
    alternates: { canonical: "/products/" + id },
  };
}
export default async function Product({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ utm_source?: string | string[] }>;
}) {
  const { id } = await params;
  // A visitor who came from a channel post (utm_source) is credited to that channel
  // on the affiliate click; anything else stays "catalog". Only safeSource values pass.
  const utm = (await searchParams).utm_source;
  const channel = safeSource(typeof utm === "string" ? utm : null);
  const clickSource = channel === "other" ? "catalog" : channel;
  if (!/^\d{4,24}$/.test(id)) notFound();
  const [snapshot, usdRate] = await Promise.all([getCatalog(), getUsdRate()]);
  const p = snapshot.items.find((p) => p.id === id);
  if (!p) {
    return (
      <PublicShell>
        <main id="main" className="bl-page">
          <div className="bl-empty">
            <h1>המוצר אינו זמין כרגע</h1>
            <p>
              המוצר אינו מופיע בקטלוג הנוכחי. אפשר לחזור לקטלוג ולבחור מוצר אחר.
            </p>
            <Link className="bl-cta" href="/deals">
              חזרה לקטלוג
            </Link>
          </div>
        </main>
      </PublicShell>
    );
  }
  const brandSlugOf = (x: typeof p) => identifyListedBrand(x)?.slug ?? null;
  const compareRows = brandCompareRows(p, snapshot.items, brandSlugOf);
  const shown = new Set(compareRows.map((x) => x.id));
  const pBrand = brandSlugOf(p);
  // More from the same brand in other categories (the comparison table covers this one).
  const moreFromBrand = pBrand
    ? snapshot.items.filter((x) => x.id !== id && !shown.has(x.id) && brandSlugOf(x) === pBrand && x.categorySlug !== p.categorySlug)
        .sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0)).slice(0, 4)
    : [];
  moreFromBrand.forEach((x) => shown.add(x.id));
  const similar = snapshot.items
    .filter((x) => x.id !== id && !shown.has(x.id) && x.categorySlug === p.categorySlug)
    .slice(0, 4);
  // Only for a price shown as current: a withheld price gets no chart either.
  const history =
    snapshot.source === "store" && p.price && p.priceStatus === "current"
      ? priceHistorySeries(await storedPriceHistory(p.id), { currency: p.currency, skuId: p.priceFields?.skuId ?? null })
      : null;
  const verified = evaluateEligibility(p).eligible;
  const brand = identifyListedBrand(p);
  const displayTitle = productDisplayTitle(p.title, brand?.name ?? null);
  const images = p.images?.length ? p.images : p.image ? [p.image] : [];
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(iso));
  const updated = snapshot.fetchedAt ? fmt(snapshot.fetchedAt) : "לא זמין";
  // Database-backed items carry the observation time of the shown price; a
  // stale price is already withheld (price null) and is said so plainly.
  const priceLabel =
    p.priceStatus === "current" && p.priceObservedAt
      ? `מחיר מ־AliExpress (${p.priceMethod === "detail" ? "בדיקה לפי מזהה מוצר" : p.priceMethod === "confirmed" ? "מחיר בשקלים מחיפוש; המחיר בדולר אומת ללא שינוי בבדיקת מוצר" : "תוצאת חיפוש"}) · נבדק ${fmt(p.priceObservedAt)}`
      : p.priceStatus === "stale"
        ? `המחיר האחרון נבדק ${p.priceObservedAt ? fmt(p.priceObservedAt) : "מזמן"} ולכן אינו מוצג כעדכני`
        : p.priceStatus === "unknown"
          ? "לא התקבל מחיר תקין מ־AliExpress"
          : "מחיר ספק בשקלים";
  const fresh = freshnessLabel(p.priceObservedAt);
  const total = estimateIsraelTotal(p.currency === "ILS" && p.price ? Number(p.price) : null, usdRate, IMPORT_TAX);
  const hasLink = validAffiliateUrl(p.affiliateUrl, p.productUrl);
  const cta = hasLink ? (
    <a className="bl-cta" href={"/go/" + p.id + "?source=" + clickSource} rel="sponsored noopener noreferrer" target="_blank">
      לבדיקת מחיר ומשלוח ב־AliExpress <ExternalLink size={18} aria-hidden="true" />
    </a>
  ) : p.productUrl ? (
    <a className="bl-cta is-ghost" href={p.productUrl} rel="noopener noreferrer" target="_blank">
      לעמוד המקור · ללא קישור שותפים <ExternalLink size={18} aria-hidden="true" />
    </a>
  ) : (
    <p className="bl-note">לא התקבל קישור מקור תקין.</p>
  );
  return (
    <PublicShell>
      <main id="main" className="bl-page bl-product">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString([
              productJsonLd({ ...p, title: displayTitle }, siteOrigin(), brand?.name ?? null),
              breadcrumbJsonLd(siteOrigin(), [
                { name: "בית", path: "/" },
                { name: p.category, path: "/categories/" + p.categorySlug },
                { name: displayTitle, path: "/products/" + p.id },
              ]),
            ]),
          }}
        />
        <nav className="bl-crumbs" aria-label="מיקום">
          <Link href="/">בית</Link>
          <span aria-hidden="true">/</span>
          <Link href={"/categories/" + p.categorySlug}>{p.category}</Link>
        </nav>
        <div className="bl-product-grid">
          <div className="bl-product-media">
            <ProductGallery images={images} title={displayTitle} label={brand?.name ?? null} video={p.video ?? null} />
          </div>
          <div className="bl-product-side">
            {brand && (
              <Link className="bl-card-brand sr-product-brand" href={"/brands/" + brand.slug} dir="ltr" aria-label={"לכל מוצרי המותג " + brand.name}>
                <BrandLogo slug={brand.slug} name={brand.name} compact />
              </Link>
            )}
            <h1 dir="auto">{displayTitle}</h1>
            <p className="bl-product-meta">
              {p.orders !== null ? p.orders.toLocaleString("he-IL") + " מכירות מדווחות לפי הספק" : "נתוני מכירות אינם זמינים"}
              {p.shopName ? <> · חנות: <span dir="auto">{p.shopName}</span></> : null}
            </p>

            <section className="bl-receipt" aria-label="מחיר וקנייה">
              <div className="bl-receipt-row bl-receipt-price">
                <span>{priceLabel}</span>
                <strong dir="ltr">{p.price ? formatMoney(p.price, p.currency) : "אין מחיר עדכני"}</strong>
              </div>
              {p.price && fresh && (
                <p className={"bl-receipt-fresh" + ((priceAgeHours(p.priceObservedAt) ?? 0) > PRICE_WARN_AGE_HOURS ? " is-old" : "")}>
                  {fresh}
                  {(priceAgeHours(p.priceObservedAt) ?? 0) > PRICE_WARN_AGE_HOURS && " · ייתכן שהמחיר השתנה מאז, בדקו אותו ב־AliExpress"}
                </p>
              )}
              {p.price && (
                <p className="bl-receipt-note" role="note">
                  המחיר הסופי נקבע בקופה של AliExpress. ייתכנו דמי משלוח, תוספת לדגם או לצבע אחר, ושינוי מחיר מאז הבדיקה.
                </p>
              )}
              <div className="bl-receipt-row">
                <span>מיסוי ביבוא אישי</span>
                <TaxBadge price={p.currency === "ILS" ? p.price : null} usdRate={usdRate} />
              </div>
              <div className="bl-receipt-row">
                <span>משלוח לישראל</span>
                <span className="bl-muted">מוצג בקופה של AliExpress</span>
              </div>
              <div className="bl-receipt-row bl-receipt-total">
                <span>השורה התחתונה: עלות משוערת לישראל</span>
                {p.currency === "ILS" && p.price && total.totalIls !== null ? (
                  <strong className="bl-total" dir="rtl">{total.label}</strong>
                ) : (
                  <span className="bl-muted">{p.currency === "ILS" && p.price ? "לא חושבה (חסר שער דולר)" : "אין מחיר בשקלים לחישוב"}</span>
                )}
              </div>
              {p.currency === "ILS" && p.price && total.totalIls !== null && (
                <p className="bl-total-note">
                  {total.note} <a href="#cost-calculator">הוסיפו משלוח במחשבון</a>
                </p>
              )}
              {cta}
              <ul className="sr-assure" aria-label="מה חשוב לדעת">
                <li><Clock size={15} aria-hidden="true" />{p.price && fresh ? fresh : "זמן בדיקת המחיר מוצג כשידוע"}</li>
                <li><Receipt size={15} aria-hidden="true" />אומדן מסי יבוא לישראל</li>
                <li><ShieldCheck size={15} aria-hidden="true" />התשלום מתבצע ב־AliExpress</li>
              </ul>
              <p className="bl-fine">
                {hasLink
                  ? "קישור שותפים: ייתכן שנקבל עמלה, בלי עלות נוספת לכם. בדקו ב־AliExpress את הדגם, המוכר והמחיר בקופה."
                  : "לא התקבל קישור קידום למוצר."}
              </p>
            </section>

            <div className={"dp-selection-policy bl-policy " + (verified ? "is-go" : "is-wait")}>
              <strong>{verified ? "בדיקות האיכות עברו" : "איכות ומקוריות לא אומתו"}</strong>
              {!verified && <p>דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו. בדקו אותם ב־AliExpress לפני רכישה.</p>}
            </div>
          </div>
        </div>

        {history && <PriceHistoryChart history={history} />}

        {brand && <BrandCompare rows={compareRows} currentId={p.id} brandName={brand.name} brandSlug={brand.slug} />}


        {p.currency === "ILS" && p.price && Number(p.price) > 0 ? (
          <div className="bl-section">
            <ProductCostCalculator key={p.id} priceILS={Number(p.price)} usdRate={usdRate} />
            <div className="fp-tax-box bl-tax-note" aria-label="מיסוי ביבוא אישי">
              <TaxBadge price={p.price} usdRate={usdRate} detail />
              <small>
                ההערכה מבוססת על תקרת הפטור הכללית של {IMPORT_TAX.exemptionUsd}$ ושיעור מע&quot;מ של {Math.round((IMPORT_TAX.vatRate ?? 0) * 100)}%. ייתכנו מס קנייה, חריגים וחיובים נוספים בהתאם למוצר.
                {usdRate ? ` שער יציג ${usdRate.rate} ₪ (${new Date(usdRate.date).toLocaleDateString("he-IL")}).` : ""} ההערכה מתייחסת לפריט אחד
                במחיר המוצג; גרסה אחרת, כמות או פריטים נוספים מאותו מוכר בתוך {IMPORT_TAX.combineWindowHours} שעות משנים את החישוב.{" "}
                <a href={IMPORT_TAX.sources[0].url} target="_blank" rel="noopener noreferrer">מחשבון רשות המסים</a>
              </small>
            </div>
          </div>
        ) : null}

        <section className="bl-section bl-checklist" aria-labelledby="bl-before-buy">
          <h2 id="bl-before-buy">לפני שלוחצים על קנייה</h2>
          <ul>
            <li>משלוח לישראל, זמן אספקה, מלאי וגרסה מדויקת: יש לבדוק אצל המוכר.</li>
            <li>ודאו שהווריאציה שבחרתם כוללת את האביזרים הדרושים ושמחירה בקופה תואם למחיר שחישבתם.</li>
            <li>כמות מכירות אינה דירוג איכות. בדקו ביקורות אמיתיות ואת מספר המדרגים.</li>
            <li>בדקו אם נדרש אישור יבוא או תקן מיוחד (ציוד תקשורת, סוללות, חלקי רכב).</li>
            <li>בדקו מדיניות החזרות, אחריות ועמלות שחרור של חברת השילוח.</li>
          </ul>
          <p className="bl-fine">
            {snapshot.source === "store"
              ? `נתוני המוצר נשמרים במאגר ומתעדכנים בייבוא היומי. המחיר שייך לווריאציה שהספק דיווח עליה${p.priceFields?.skuId ? ` (SKU ${p.priceFields.skuId})` : ""}; מחיר הווריאציה שתבחרו, מחיר באפליקציה, קופונים ומשלוח עשויים לשנות את הסכום.`
              : `עדכון נתוני ספק: ${updated}. הקטלוג מתרענן עד כל שש שעות.`}
          </p>
        </section>

        {brand && moreFromBrand.length > 0 && (
          <section className="bl-section" aria-labelledby="sr-more-brand">
            <div className="sr-compare-head">
              <div>
                <h2 id="sr-more-brand">עוד מ־<span dir="ltr">{brand.name}</span></h2>
                <p className="bl-fine">מוצרים נוספים של המותג בקטגוריות אחרות, לפי מכירות מדווחות של הספק.</p>
              </div>
              <Link className="bl-more" href={"/brands/" + brand.slug}>כל מוצרי <span dir="ltr">{brand.name}</span> <ArrowUpLeft size={16} aria-hidden="true" /></Link>
            </div>
            <div className="bl-grid">
              {moreFromBrand.map((item) => (
                <ProductCard key={item.id} item={item} usdRate={usdRate} />
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="bl-section" aria-labelledby="bl-similar">
            <h2 id="bl-similar">חלופות מאותה קטגוריה</h2>
            <p className="bl-fine">מוצרים מאותה קטגוריה עם מחירים לפי הספק. לא דירוג איכות ולא הבטחת התאמה.</p>
            <div className="bl-grid">
              {similar.map((item) => (
                <ProductCard key={item.id} item={item} usdRate={usdRate} />
              ))}
            </div>
          </section>
        )}

        {hasLink && (
          <div className="bl-buybar" aria-hidden="true">
            <span className="sr-buybar-price">
              <strong dir="ltr">{p.price ? formatMoney(p.price, p.currency) : "אין מחיר עדכני"}</strong>
              <small>{p.price ? "מחיר מדווח · סופי בקופה" : "בדקו את המחיר ב־AliExpress"}</small>
            </span>
            <a className="bl-cta" href={"/go/" + p.id + "?source=" + clickSource} rel="sponsored noopener noreferrer" target="_blank" tabIndex={-1}>
              בדיקת מחיר ב־AliExpress
            </a>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
