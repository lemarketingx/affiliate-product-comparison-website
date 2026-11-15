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
    [
      "תרגום עברי ומיון לפי רכישות",
      "נבדקו בהצלחה מול AliExpress ב־14.11.2026 · HE ו־LAST_VOLUME_DESC",
    ],
    [
      "ביקורות לפי מדינת קונה",
      "נחסם בחשבון בבדיקה חיה: InsufficientPermission · נדרשת הרשאת API",
    ],
    [
      "סינון ציבורי",
      "יותר מ־500 רכישות, 4.7/5 ומעלה, ביקורת מישראל ומשלוח מאומת · נתון חסר חוסם הצגה",
    ],
    [
      "משלוח לישראל",
      "IL נשלח בשאילתה · זמינות משלוח אינה מאומתת מעצם הגדרת יעד",
    ],
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
