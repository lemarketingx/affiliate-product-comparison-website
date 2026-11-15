import Link from "next/link";
import { requireAdmin } from "../../../../lib/dealpilot/auth";
const steps = [
  ["01", "גילוי ואימות נתונים", "פעיל לפי בקשת טעינת הקטלוג, עם מטמון"],
  ["02", "שלמות נתונים וסימני ביקוש", "ניתוח שקוף על נתוני הספק"],
  ["03", "בדיקה אנושית וטיוטה", "כלי מקומי בלשונית; ללא שמירה בשרת"],
  ["04", "תזמון ופרסום מורשה", "לא זמין · נדרשים אחסון, הרשאות ואישור"],
  ["05", "למידה מדוחות ביצועים", "לא זמין · נדרש אימות ממשק הדוחות"],
];
export default async function AutomationsPage() {
  await requireAdmin();
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">AUTOMATION FLOW</span>
          <h1>כל שלב צריך להצדיק את הבא.</h1>
          <p className="dp-muted">
            מפת יכולות המערכת. אין תהליך רקע, Cron או פרסום אוטומטי.
          </p>
        </div>
      </header>
      <section className="dp-panel">
        <ol>
          {steps.map(([number, title, status]) => (
            <li key={number}>
              <h2>
                {number} · {title}
              </h2>
              <p>{status}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="dp-panel">
        <h2>לפני הפעלת תזמון</h2>
        <p>
          נדרש מאגר מינימלי עם מזהה מוצר ייחודי, סטטוס אישור, מזהה ערוץ ומפתח
          למניעת פרסום כפול. זיכרון השרת והדפדפן אינם תור אמין בפריסת Vercel.
        </p>
        <p>
          החלופה המוצעת היא אחסון KV מנוהל קטן ומוגבל, לאחר בחינת תוכנית חינמית
          או תשלום לפי שימוש ואישור העלות. הוא ישמש להחלטות ותור בלבד, ללא העתקת
          דוחות AliExpress. לא הוקם אחסון.
        </p>
        <Link href="/admin/settings" className="dp-btn-secondary">
          בדיקת הגדרות
        </Link>
      </section>
    </>
  );
}
