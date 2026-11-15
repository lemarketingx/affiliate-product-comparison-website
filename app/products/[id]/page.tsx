import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ShieldQuestion, ArrowUpLeft } from "lucide-react";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { formatMoney } from "../../../lib/dealpilot/urls";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
import { evaluateEligibility } from "../../../lib/aliexpress/quality";
import ProductGallery from "../../product-gallery";
import { StoreLine } from "../../product-card";
import { BrandChip, discountOf } from "../../product-card";
import { FavButton } from "../../favorites";
import { brandBySlug } from "../../../lib/dealpilot/brands";
import { israelPriceFor } from "../../../lib/dealpilot/israel-prices";
import { warrantyFor } from "../../../lib/dealpilot/product-warranty";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getCatalog()).items.find((p) => p.id === id);
  return {
    title: p ? p.title + " · " + p.category + " | DealPilot" : "המוצר אינו זמין | DealPilot",
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
  const snapshot = await getCatalog(),
    p = snapshot.items.find((p) => p.id === id);
  if (!p) {
    return (
      <PublicShell>
        <main id="main" className="og-wrap og-section">
          <div className="og-empty">
            <h1>המוצר אינו זמין כרגע</h1>
            <p>
              המוצר אינו מופיע בקטלוג הנוכחי. אפשר לחזור לקטלוג ולבחור מוצר אחר.
            </p>
            <Link className="og-btn" href="/deals">
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
  const brand = brandBySlug(p.categorySlug);
  const il = israelPriceFor(p.id);
  const warranty = warrantyFor(p.id);
  const off = discountOf(p);
  const ali = Number(p.price);
  const gap = il && Number.isFinite(ali) ? il.price - ali : null;
  const images = p.images?.length ? p.images : p.image ? [p.image] : [];
  const updated = snapshot.fetchedAt
    ? new Intl.DateTimeFormat("he-IL", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jerusalem",
      }).format(new Date(snapshot.fetchedAt))
    : "לא זמין";
  const cta = p.affiliateUrl ? (
    <a
      className="og-btn og-btn-go og-btn-block"
      href={p.affiliateUrl}
      rel="sponsored noopener noreferrer"
      target="_blank"
    >
      לחנות הרשמית ב־AliExpress <ExternalLink size={18} />
    </a>
  ) : p.productUrl ? (
    <a
      className="og-btn og-btn-ghost og-btn-block"
      href={p.productUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      לעמוד המקור · ללא קישור שותפים <ExternalLink size={18} />
    </a>
  ) : null;
  return (
    <PublicShell>
      <main id="main" className="og-wrap og-product-page">
        <nav className="og-crumbs" aria-label="מיקום">
          <Link href="/brands">מותגים</Link>
          <span>/</span>
          <Link href={"/brands/" + p.categorySlug}>{brand?.he ?? p.category}</Link>
          <span>/ פרטי מוצר</span>
        </nav>
        <div className="og-detail">
          <ProductGallery images={images} title={p.title} />
          <div className="og-detail-side">
            <div className="og-certificate">
              <div className="og-certificate-top">
                <BrandChip slug={p.categorySlug} name={p.category} />
                <FavButton fav={{ id: p.id, title: p.title, image: p.image, price: formatMoney(p.price, p.currency), brand: p.category }} />
              </div>
              <h1 dir="auto">{p.title}</h1>
              <StoreLine item={p} />
              <div className="og-price-row">
                <div>
                  <small>מחיר ספק באליאקספרס</small>
                  <strong dir="auto">{formatMoney(p.price, p.currency)}</strong>
                  {off && (
                    <span className="og-was">
                      <s dir="auto">{formatMoney(p.originalPrice, p.currency)}</s>
                      <b>‎-{off}%</b> הנחה לפי מחיר המקור שדווח
                    </span>
                  )}
                </div>
              </div>
              {il ? (
                <div className="og-compare">
                  <div>
                    <small>בישראל · {il.store}</small>
                    <strong dir="auto">{formatMoney(String(il.price), "ILS")}</strong>
                  </div>
                  {gap !== null && gap > 0 && (
                    <div className="og-compare-gap">
                      <small>פער משוער</small>
                      <strong dir="auto">{formatMoney(String(gap), "ILS")}</strong>
                    </div>
                  )}
                  <p className="og-fine">
                    מחיר בישראל נבדק ב־{il.checkedAt}
                    {il.importerWarranty ? " וכולל אחריות יבואן רשמי" : ""}.{" "}
                    <a href={il.url} target="_blank" rel="noopener noreferrer">למקור</a>. הפער
                    לא כולל משלוח, מע״מ או מכס, אם יחולו.
                  </p>
                </div>
              ) : (
                <p className="og-fine">עוד לא השווינו את המוצר הזה למחיר בחנויות בישראל.</p>
              )}
              <p className="og-fine">המחיר הסופי, המסים והמשלוח נבדקים ב־AliExpress.</p>
              {cta ?? <div className="og-notice">לא התקבל קישור מקור תקין.</div>}
              <p className="og-fine">
                {p.affiliateUrl
                  ? "קישור שותפים: ייתכן שנקבל עמלה. ייחוס העמלה טרם נבדק בחשבון."
                  : "לא התקבל קישור קידום למוצר."}
              </p>
            </div>
            <div className={"dp-selection-policy og-notice " + (verified ? "is-go" : "")}>
              <div>
                <strong>{verified ? "מאומת לפי תנאי הסינון" : "טרם נבדק לפי תנאי הסינון שלך"}</strong>
                {!verified && <p>דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו. יש לבדוק אותם ב־AliExpress לפני רכישה.</p>}
              </div>
            </div>
            {p.titleLanguage === "he" && (
              <p className="og-fine">
                מידע בעברית שהוחזר מ־AliExpress. יש לבדוק את המפרט המקורי לפני רכישה.
              </p>
            )}
            <div className="og-warranty-box">
              <ShieldQuestion size={22} aria-hidden="true" />
              <div>
                <strong>מי נותן אחריות ואיפה מממשים?</strong>
                {warranty ? <>
                  <p><b>נותן האחריות:</b> {warranty.provider}</p>
                  <p><b>מדינת שירות:</b> {warranty.serviceCountry}</p>
                  <p><b>כתובת שירות:</b> {warranty.serviceAddress ?? "לא נמסרה כתובת שירות מאומתת"}</p>
                  <p><b>תקופת אחריות:</b> {warranty.durationMonths === null ? "לא צוינה בתקנון שנבדק" : warranty.durationMonths + " חודשים"}</p>
                  {warranty.scope && <p><b>כיסוי:</b> {warranty.scope}</p>}
                  <p><a href={warranty.sourceUrl} target="_blank" rel="noopener noreferrer">לתנאי האחריות שנבדקו</a> · עדכון: {warranty.checkedAt}</p>
                </> : <>
                  <p><b>נותן האחריות:</b> לא אומת. המותג, המוכר והיבואן בישראל אינם בהכרח אותו גורם.</p>
                  <p><b>היכן מממשים אחריות:</b> לא אומת. יש לבדוק מול המוכר אם השירות בישראל או דורש משלוח לחו״ל ועל חשבון מי.</p>
                  <p><b>תקופה ותנאים:</b> לא נמסרו נתוני אחריות מאומתים ב־Affiliate API.</p>
                  <p>בקשו מהמוכר תנאי אחריות בכתב, כתובת שירות, תהליך טיפול ותנאי משלוח חזרה לפני התשלום.</p>
                </>}
                <Link className="og-link" href="/warranty">
                  כל מה שכדאי לבדוק <ArrowUpLeft size={15} />
                </Link>
              </div>
            </div>
            <div className="og-known">
              <h2>מה ידוע, ומה כדאי לבדוק</h2>
              <ul>
                <li>
                  {p.orders !== null
                    ? p.orders.toLocaleString("he-IL") +
                      " הזמנות לפי נתוני הספק; התקופה ואיכות המוצר לא אומתו."
                    : "נתוני הזמנות אינם זמינים."}
                </li>
                <li>משלוח לישראל, זמן אספקה, מלאי וגרסה מדויקת: יש לבדוק אצל המוכר.</li>
                <li>לא ביצענו בדיקת שימוש עצמאית ולא התקבלו מפרט מלא או אישורי בטיחות.</li>
                <li>נדרשת בדיקת ביקורות המוכר ומדיניות ההחזרה לפני רכישה.</li>
              </ul>
              <p className="og-fine">
                עדכון נתוני ספק: {updated}. הקטלוג מתרענן עד כל שש שעות.
              </p>
            </div>
          </div>
        </div>
        {similar.length > 0 && (
          <section className="og-section">
            <div className="og-section-head">
              <div>
                <span className="og-kicker">מאותה חנות רשמית</span>
                <h2>עוד מ־{brand?.he ?? p.category}</h2>
              </div>
              <Link className="og-link" href={"/brands/" + p.categorySlug}>
                לכל המוצרים של המותג <ArrowUpLeft size={16} />
              </Link>
            </div>
            <div className="og-grid">
              {similar.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
        {cta && (
          <div className="og-buybar">
            <div>
              <small dir="ltr">{p.category}</small>
              <strong dir="auto">{formatMoney(p.price, p.currency)}</strong>
            </div>
            {cta}
          </div>
        )}
      </main>
    </PublicShell>
  );
}
