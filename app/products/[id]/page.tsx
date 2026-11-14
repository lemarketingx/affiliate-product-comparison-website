import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ImageOff } from "lucide-react";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { formatMoney } from "../../../lib/dealpilot/urls";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
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
  const snapshot = await getCatalog(),
    p = snapshot.items.find((p) => p.id === id);
  if (!p) {
    return (
      <PublicShell>
        <main id="main" className="dp-container dp-section">
          <div className="dp-empty">
            <h1>המוצר אינו זמין כרגע</h1>
            <p>
              המוצר אינו מופיע בקטלוג המסונן. אנחנו מציגים רק מוצרים שעברו אימות
              רכישות, דירוג, ביקורת מישראל ומשלוח לישראל.
            </p>
            <Link className="dp-btn" href="/deals">
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
  return (
    <PublicShell>
      <main id="main" className="dp-container">
        <nav className="dp-breadcrumb" aria-label="מיקום">
          <Link href="/">בית</Link>
          <span>/</span>
          <Link href={"/categories/" + p.categorySlug}>{p.category}</Link>
          <span>/ פרטי מוצר</span>
        </nav>
        <div className="dp-detail">
          <div className="dp-detail-image">
            {p.image ? (
              <img
                src={p.image}
                alt={p.title}
                width={600}
                height={500}
                referrerPolicy="no-referrer"
              />
            ) : (
              <ImageOff size={60} />
            )}
            {p.images?.length > 1 && (
              <div className="dp-detail-thumbnails">
                {p.images.slice(1).map((image, index) => (
                  <a
                    key={image}
                    href={image}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={"פתיחת תמונת מוצר " + (index + 2)}
                  >
                    <img
                      src={image}
                      width={80}
                      height={80}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      alt={"תמונת מוצר " + (index + 2)}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="dp-eyebrow">{p.category}</span>
            <h1 dir="auto">{p.title}</h1>
            {p.titleLanguage === "he" && (
              <p className="dp-disclosure">
                מידע בעברית שהוחזר מ־AliExpress. יש לבדוק את המפרט המקורי לפני
                רכישה.
              </p>
            )}
            {p.shopName && <p>חנות לפי הספק: {p.shopName}</p>}
            <div className="dp-detail-price" dir="auto">
              {formatMoney(p.price, p.currency)}
            </div>
            <p>
              מחיר במטבע שהתקבל מהספק. המחיר הסופי, המסים והמשלוח נבדקים
              ב־AliExpress.
            </p>
            {p.affiliateUrl ? (
              <a
                className="dp-btn"
                href={"/go/" + id + "?source=catalog"}
                rel="sponsored noopener noreferrer"
                target="_blank"
              >
                לבדיקת המוצר ב־AliExpress <ExternalLink size={18} />
              </a>
            ) : p.productUrl ? (
              <a
                className="dp-btn dp-btn-secondary"
                href={p.productUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                לעמוד המקור · ללא קישור שותפים <ExternalLink size={18} />
              </a>
            ) : (
              <div className="dp-notice">לא התקבל קישור מקור תקין.</div>
            )}
            <p className="dp-disclosure">
              {p.affiliateUrl
                ? "קישור שותפים: ייתכן שנקבל עמלה. ייחוס העמלה טרם נבדק בחשבון."
                : "לא התקבל קישור קידום למוצר."}
            </p>
            <div className="dp-detail-info">
              <h2>מה ידוע, ומה כדאי לבדוק</h2>
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
                <li>נדרשת בדיקת ביקורות המוכר ומדיניות ההחזרה לפני רכישה.</li>
              </ul>
            </div>
            <p className="dp-disclosure">
              עדכון נתוני ספק:{" "}
              {snapshot.fetchedAt
                ? new Intl.DateTimeFormat("he-IL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jerusalem",
                  }).format(new Date(snapshot.fetchedAt))
                : "לא זמין"}
              . הקטלוג מתרענן עד כל שש שעות.
            </p>
          </div>
        </div>
        {similar.length > 0 && (
          <section className="dp-section">
            <div className="dp-section-head">
              <h2>עוד באותה קטגוריה</h2>
            </div>
            <div className="dp-product-grid">
              {similar.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
