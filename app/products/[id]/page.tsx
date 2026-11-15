import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { validAffiliateUrl } from "../../../lib/aliexpress/catalog-build";
import { formatMoney } from "../../../lib/dealpilot/urls";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
import { evaluateEligibility } from "../../../lib/aliexpress/quality";
import ProductGallery from "../../product-gallery";
import PreflightCheck from "../../preflight-check";
import { Barcode, flightCode, gateCode } from "../../flight-bits";
import { categories } from "../../../lib/dealpilot/categories";
import { ProductBriefing } from "../../_preflight/product-briefing";
import { getUsdRate } from "../../../lib/dealpilot/fx";
import { TaxBadge } from "../../tax-badge";
import ProductCostCalculator from "../../product-cost-calculator";
import { IMPORT_TAX } from "../../../lib/preflight/import-tax";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getCatalog()).items.find((p) => p.id === id);
  return {
    title: p ? p.title + " | DealPilot" : "המוצר אינו זמין | DealPilot",
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
        <main id="main" className="fp-wrap fp-section">
          <div className="fp-empty">
            <h1>המוצר אינו זמין כרגע</h1>
            <p>
              המוצר אינו מופיע בקטלוג הנוכחי. אפשר לחזור לקטלוג ולבחור מוצר אחר.
            </p>
            <Link className="fp-btn" href="/deals">
              חזרה לקטלוג
            </Link>
          </div>
        </main>
      </PublicShell>
    );
  }
  const similar = snapshot.items
    .filter((x) => x.id !== id && x.categorySlug === p.categorySlug)
    .slice(0, 3);
  const verified = evaluateEligibility(p).eligible;
  const gate = gateCode(Math.max(0, categories.findIndex((c) => c.slug === p.categorySlug)));
  const images = p.images?.length ? p.images : p.image ? [p.image] : [];
  const updated = snapshot.fetchedAt
    ? new Intl.DateTimeFormat("he-IL", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jerusalem",
      }).format(new Date(snapshot.fetchedAt))
    : "לא זמין";
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-product-page">
        <nav className="fp-crumbs" aria-label="מיקום">
          <Link href="/">בית</Link>
          <span>/</span>
          <Link href={"/categories/" + p.categorySlug}>{p.category}</Link>
          <span>/ פרטי מוצר</span>
        </nav>
        <div className="fp-detail">
          <ProductGallery images={images} title={p.title} />
          <div className="fp-detail-side">
            <div className="fp-ticket">
              <div className="fp-ticket-top">
                <span className="fp-kicker">כרטיס עלייה למטוס</span>
                <span dir="ltr" className="fp-ticket-code">{flightCode(p.id)}</span>
              </div>
              <h1 dir="auto">{p.title}</h1>
              <dl className="fp-ticket-grid">
                <div>
                  <dt>שער</dt>
                  <dd dir="ltr">{gate}</dd>
                </div>
                <div>
                  <dt>מחלקה</dt>
                  <dd>{p.category}</dd>
                </div>
                <div>
                  <dt>הזמנות לפי הספק</dt>
                  <dd>{p.orders !== null ? p.orders.toLocaleString("he-IL") : "לא זמין"}</dd>
                </div>
                {p.shopName && (
                  <div>
                    <dt>חנות לפי הספק</dt>
                    <dd dir="auto">{p.shopName}</dd>
                  </div>
                )}
              </dl>
              <div className={"dp-selection-policy fp-notice " + (verified ? "is-go" : "is-wait")}>
                <div>
                  <strong>{verified ? "מאומת לפי תנאי הסינון" : "טרם נבדק לפי תנאי הסינון שלך"}</strong>
                  {!verified && <p>דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו. יש לבדוק אותם ב־AliExpress לפני רכישה.</p>}
                </div>
              </div>
              {p.titleLanguage === "he" && (
                <p className="fp-fine">
                  מידע בעברית שהוחזר מ־AliExpress. יש לבדוק את המפרט המקורי לפני
                  רכישה.
                </p>
              )}
              <div className="fp-perf fp-perf-wide" aria-hidden="true" />
              <div className="fp-ticket-price">
                <div>
                  <small>מחיר ספק בשקלים</small>
                  <strong dir="auto">{formatMoney(p.price, p.currency)}</strong>
                </div>
                <Barcode seed={p.id} />
              </div>
              {p.currency === "ILS" && p.price && Number(p.price) > 0 ? (
                <ProductCostCalculator key={p.id} priceILS={Number(p.price)} usdRate={usdRate} />
              ) : <div className="fp-notice is-wait">אין מחיר בשקלים ולכן אי אפשר לחשב עלות רכישה.</div>}
              <div className="fp-tax-box" aria-label="מיסוי ביבוא אישי">
                <strong>מיסוי ביבוא אישי</strong>
                <TaxBadge price={p.currency === "ILS" ? p.price : null} usdRate={usdRate} detail />
                <small>
                  לפי רשות המסים: עד {IMPORT_TAX.exemptionUsd}$ פטור, מעל זה מע&quot;מ {Math.round((IMPORT_TAX.vatRate ?? 0) * 100)}% (כולל על המשלוח).
                  {usdRate ? ` שער יציג ${usdRate.rate} ₪ (${new Date(usdRate.date).toLocaleDateString("he-IL")}).` : ""} ההערכה מתייחסת לפריט אחד
                  במחיר המוצג; גרסה אחרת, כמות או פריטים נוספים מאותו מוכר בתוך {IMPORT_TAX.combineWindowHours} שעות משנים את החישוב.{" "}
                  <a href={IMPORT_TAX.sources[0].url} target="_blank" rel="noopener noreferrer">מחשבון רשות המסים</a>
                </small>
              </div>
              <p className="fp-fine">
                המחיר הסופי והמשלוח נבדקים ב־AliExpress.
              </p>
              {validAffiliateUrl(p.affiliateUrl, p.productUrl) ? (
                <a
                  className="fp-btn fp-btn-block"
                  href={p.affiliateUrl!}
                  rel="sponsored noopener noreferrer"
                  target="_blank"
                >
                  לבדיקת המוצר ב־AliExpress <ExternalLink size={18} />
                </a>
              ) : p.productUrl ? (
                <a
                  className="fp-btn fp-btn-ghost fp-btn-block"
                  href={p.productUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  לעמוד המקור · ללא קישור שותפים <ExternalLink size={18} />
                </a>
              ) : (
                <div className="fp-notice">לא התקבל קישור מקור תקין.</div>
              )}
              <p className="fp-fine">
                {validAffiliateUrl(p.affiliateUrl, p.productUrl)
                  ? "קישור שותפים: ייתכן שנקבל עמלה. ייחוס העמלה טרם נבדק בחשבון."
                  : "לא התקבל קישור קידום למוצר."}
              </p>
            </div>
            <PreflightCheck />
            <ProductBriefing
              title={p.title}
              priceILS={p.currency === "ILS" && Number.isFinite(Number(p.price)) && Number(p.price) > 0 ? Number(p.price) : null}
              usdRate={usdRate}
            />
            <div className="fp-known fp-buy-checks">
              <h2>לפני שלוחצים על קנייה</h2>
              <p className="fp-fine">נתונים שלא התקבלו מה־API מסומנים כלא מאומתים, ולא כהבטחה.</p>
              <ul>
                <li>
                  {p.orders !== null
                    ? p.orders.toLocaleString("he-IL") +
                      " הזמנות לפי נתוני הספק; התקופה ואיכות המוצר לא אומתו."
                    : "נתוני הזמנות אינם זמינים."}
                </li>
                <li>
                  משלוח לישראל, זמן אספקה, מלאי וגרסה מדויקת: יש לבדוק אצל
                  המוכר.
                </li>
                <li>
                  לא ביצענו בדיקת שימוש עצמאית ולא התקבלו מפרט מלא או אישורי
                  בטיחות.
                </li>
                <li>בדקו ביקורות אמיתיות, את מספר המדרגים ואת תיאור המוצר הספציפי. כמות מכירות אינה דירוג איכות.</li>
                <li>ודאו שהווריאציה שבחרתם כוללת את האביזרים הדרושים ושמחירה בקופה תואם למחיר שחישבתם.</li>
                <li>בדקו האם נדרש אישור יבוא או תקן מיוחד (לדוגמה ציוד תקשורת, סוללות או חלקי רכב).</li>
                <li>בדקו מדיניות החזרות, אחריות ועמלות שחרור של חברת השילוח לפני התשלום.</li>
              </ul>
              <p className="fp-fine">
                עדכון נתוני ספק: {updated}. הקטלוג מתרענן עד כל שש שעות.
              </p>
            </div>
          </div>
        </div>
        {similar.length > 0 && (
          <section className="fp-section">
            <div className="fp-section-head">
              <div>
                <span className="fp-kicker">טיסות נוספות מאותו שער</span>
                <h2>השוו לפני שבוחרים</h2>
                <p className="fp-fine">שלוש חלופות מקטגוריה דומה, עם מחירים לפי הספק וקישורי שותפים. לא דירוג איכות או הבטחת התאמה.</p>
              </div>
            </div>
            <div className="fp-grid">
              {similar.map((item) => (
                <ProductCard key={item.id} item={item} usdRate={usdRate} />
              ))}
            </div>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
