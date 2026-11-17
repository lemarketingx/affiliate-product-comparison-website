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
import { freshnessLabel } from "../../../lib/catalog-store/price-view";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getCatalog()).items.find((p) => p.id === id);
  return {
    title: p ? p.title + " | " + BRAND.name : "המוצר אינו זמין | " + BRAND.name,
    alternates: { canonical: "/products/" + id },
  };
}
export default async function Product({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const similar = snapshot.items
    .filter((x) => x.id !== id && x.categorySlug === p.categorySlug)
    .slice(0, 4);
  const verified = evaluateEligibility(p).eligible;
  const brand = identifyListedBrand(p);
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
  const hasLink = validAffiliateUrl(p.affiliateUrl, p.productUrl);
  const cta = hasLink ? (
    <a className="bl-cta" href={"/go/" + p.id + "?source=catalog"} rel="sponsored noopener noreferrer" target="_blank">
      לבדיקת המוצר ב־AliExpress <ExternalLink size={18} aria-hidden="true" />
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
        <nav className="bl-crumbs" aria-label="מיקום">
          <Link href="/">בית</Link>
          <span aria-hidden="true">/</span>
          <Link href={"/categories/" + p.categorySlug}>{p.category}</Link>
        </nav>
        <div className="bl-product-grid">
          <div className="bl-product-media">
            <ProductGallery images={images} title={p.title} label={brand?.name ?? null} />
          </div>
          <div className="bl-product-side">
            {brand && (
              <Link className="bl-card-brand" href={"/brands/" + brand.slug} dir="ltr" aria-label={"לכל מוצרי המותג " + brand.name}>
                {brand.name}
              </Link>
            )}
            <h1 dir="auto">{p.title}</h1>
            <p className="bl-product-meta">
              {p.orders !== null ? p.orders.toLocaleString("he-IL") + " מכירות מדווחות לפי הספק" : "נתוני מכירות אינם זמינים"}
              {p.shopName ? <> · חנות: <span dir="auto">{p.shopName}</span></> : null}
            </p>

            <section className="bl-receipt" aria-label="מחיר וקנייה">
              <div className="bl-receipt-row bl-receipt-price">
                <span>{priceLabel}</span>
                <strong dir="ltr">{p.price ? formatMoney(p.price, p.currency) : "אין מחיר עדכני"}</strong>
              </div>
              {p.price && fresh && <p className="bl-receipt-fresh">{fresh}</p>}
              <div className="bl-receipt-row">
                <span>מיסוי ביבוא אישי</span>
                <TaxBadge price={p.currency === "ILS" ? p.price : null} usdRate={usdRate} />
              </div>
              <div className="bl-receipt-row">
                <span>משלוח לישראל</span>
                <span className="bl-muted">מוצג בקופה של AliExpress</span>
              </div>
              <div className="bl-receipt-row bl-receipt-total">
                <span>השורה התחתונה</span>
                {p.currency === "ILS" && p.price ? (
                  <a href="#cost-calculator">חשבו במחשבון למטה</a>
                ) : (
                  <span className="bl-muted">אין מחיר בשקלים לחישוב</span>
                )}
              </div>
              {cta}
              <p className="bl-fine">
                {hasLink
                  ? "קישור שותפים: ייתכן שנקבל עמלה, בלי עלות נוספת לכם. הקישור נבדק ומוביל לאותו מוצר."
                  : "לא התקבל קישור קידום למוצר."}
              </p>
            </section>

            <div className={"dp-selection-policy bl-policy " + (verified ? "is-go" : "is-wait")}>
              <strong>{verified ? "בדיקות האיכות עברו" : "איכות ומקוריות לא אומתו"}</strong>
              {!verified && <p>דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו. בדקו אותם ב־AliExpress לפני רכישה.</p>}
            </div>
          </div>
        </div>

        {p.currency === "ILS" && p.price && Number(p.price) > 0 ? (
          <div className="bl-section">
            <ProductCostCalculator key={p.id} priceILS={Number(p.price)} usdRate={usdRate} />
            <div className="fp-tax-box bl-tax-note" aria-label="מיסוי ביבוא אישי">
              <TaxBadge price={p.price} usdRate={usdRate} detail />
              <small>
                לפי רשות המסים: עד {IMPORT_TAX.exemptionUsd}$ פטור, מעל זה מע&quot;מ {Math.round((IMPORT_TAX.vatRate ?? 0) * 100)}% (כולל על המשלוח).
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
            <strong dir="ltr">{p.price ? formatMoney(p.price, p.currency) : "אין מחיר עדכני"}</strong>
            <a className="bl-cta" href={"/go/" + p.id + "?source=catalog"} rel="sponsored noopener noreferrer" target="_blank" tabIndex={-1}>
              ל־AliExpress
            </a>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
