import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  PackageSearch,
} from "lucide-react";
import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getDiscoveredCatalog } from "../../../../lib/aliexpress/catalog";
import { assessProduct } from "../../../../lib/aliexpress/scoring";
export default async function DashboardPage() {
  await requireAdmin();
  const catalog = await getDiscoveredCatalog();
  const complete = catalog.items.filter(
    (item) => assessProduct(item).status === "review",
  ).length;
  const metrics = [
    [
      "מוצרים שהתגלו",
      catalog.available ? catalog.items.length : "לא זמין",
      "בתשובת הקטלוג השמורה",
    ],
    [
      "מועמדים עם נתונים בסיסיים",
      catalog.available ? complete : "לא זמין",
      "נדרשת בדיקה אנושית",
    ],
    ["מוצרים שאושרו", "מקומי בלבד", "אין מאגר אישורים בשרת"],
    ["מוצרים שפורסמו", "לא זמין", "אין תיעוד פרסום מתמשך"],
    ["ערוצים מחוברים", "טרם חובר", "לא הופעלה הפצה"],
    ["הזמנות ועמלות", "טרם אומת", "AliExpress הוא מקור האמת"],
  ];
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">MISSION CONTROL</span>
          <h1>תמונה ברורה. החלטה טובה יותר.</h1>
          <p className="dp-muted">
            מצב המוצרים, הנתונים והחיבורים של DealPilot.
          </p>
        </div>
        <Link className="dp-btn" href="/admin/products">
          לבדיקת מוצרים <ArrowLeft size={18} />
        </Link>
      </header>
      <div className="dp-kpi-grid">
        {metrics.map(([label, value, hint]) => (
          <section className="dp-kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </section>
        ))}
      </div>
      <div className="dp-workbench">
        <section className="dp-panel">
          <h2>הפעולה הבאה שלך</h2>
          <PackageSearch size={30} />
          <h3>
            {catalog.available
              ? "בדיקה אנושית לפני הכנת תוכן"
              : "יש לבדוק את חיבור הספק"}
          </h3>
          <p>
            {catalog.available
              ? `ל־${complete} מועמדים יש מחיר, תמונה וקישורי מקור וקידום. זהו תנאי לבדיקה, ואינו אישור לאיכות המוצר או לזכאות לעמלה.`
              : "לא התקבל קטלוג זמין. אין נתוני מוצרים חלופיים או מספרי מכירות מדומים."}
          </p>
          <Link
            className="dp-btn-secondary"
            href={catalog.available ? "/admin/products" : "/admin/settings"}
          >
            {catalog.available ? "פתיחת תור הבדיקה" : "מצב החיבורים"}{" "}
            <ArrowLeft size={16} />
          </Link>
        </section>
        <section className="dp-panel">
          <h2>פעילות והתרעות</h2>
          <p>
            {catalog.available ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}{" "}
            {catalog.available
              ? "הקטלוג זמין מתשובת API שמורה"
              : "נתוני הספק אינם זמינים"}
          </p>
          {catalog.fetchedAt && (
            <p className="dp-muted">
              זמן תשובת הספק:{" "}
              <time dateTime={catalog.fetchedAt}>
                {new Date(catalog.fetchedAt).toLocaleString("he-IL", {
                  timeZone: "Asia/Jerusalem",
                })}
              </time>
            </p>
          )}
          {catalog.partial && <p>התקבלו נתונים מחלק מהקטגוריות בלבד.</p>}
          <p>
            לא קיים עדיין יומן פעילות מתמשך. החלטות העבודה בלשונית מופיעות במסך
            בדיקת המוצרים.
          </p>
          <p className="dp-muted">
            AI, תזמון והפצה דורשים חיבור ואישור נפרדים.
          </p>
        </section>
      </div>
    </>
  );
}
