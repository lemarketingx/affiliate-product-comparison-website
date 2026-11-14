import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { configured } from "../../../../lib/aliexpress/affiliate";
import { orderReportsEnabled } from "../../../../lib/aliexpress/orders";
export default async function SettingsPage() {
  await requireAdmin();
  const items = [
    ["אימות מנהל", "מוגן בצד השרת"],
    [
      "מפתחות AliExpress",
      configured() ? "הוגדרו בשרת · נדרשת בדיקה חיה" : "טרם הוגדרו בסביבה זו",
    ],
    [
      "Tracking ID",
      process.env.ALIEXPRESS_TRACKING_ID?.trim()
        ? "הוגדר · ייחוס עמלות טרם אומת"
        : "טרם הוגדר",
    ],
    [
      "דוחות הזמנות",
      orderReportsEnabled()
        ? "בקשות ידניות מופעלות · הרשאה נבדקת מול הספק"
        : "כבוי כברירת מחדל",
    ],
    ["אחסון החלטות ותורים", "טרם חובר · עבודה זמנית בזיכרון הלשונית"],
    ["AI ושירות וידאו", "טרם חוברו · לא נצרך תקציב"],
    ["הפצה ותזמון", "טרם חוברו · אין פרסום אוטומטי"],
  ];
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">SYSTEM SETTINGS</span>
          <h1>מוכנות לפני הפעלה.</h1>
          <p className="dp-muted">
            מצב הגדרות בלבד. ערכים סודיים מנוהלים בהגדרות השרת ואינם מוצגים כאן.
          </p>
        </div>
      </header>
      <section className="dp-panel">
        <dl className="dp-table">
          {items.map(([name, status]) => (
            <div key={name}>
              <dt>
                <strong>{name}</strong>
              </dt>
              <dd>{status}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="dp-notice">
        דוחות AliExpress אינם דורשים מאגר נתונים נוסף. שמירה מתמשכת של החלטות
        ותזמונים מחייבת בחירת אחסון ואישור נפרדים.
      </div>
    </>
  );
}
