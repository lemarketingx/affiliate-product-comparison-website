export const metadata = {
  title: "תנאי שימוש | DealPilot",
  alternates: { canonical: "/terms" },
};
import { PublicShell } from "../public-shell";
export default function Terms() {
  return (
    <PublicShell>
      <main id="main" className="dp-container">
        <article className="dp-prose">
          <h1>תנאי שימוש</h1>
          <p>
            DealPilot הוא אתר גילוי ותוכן בגרסת פיתוח. השימוש במידע מצריך בדיקה
            עצמאית של פרטי המוצר אצל הספק.
          </p>
          <h2>מידע משתנה</h2>
          <p>
            נתוני הספק עשויים להיות חלקיים או להשתנות מאז טעינתם. אין התחייבות
            להתאמה לצורך מסוים, למלאי, למחיר, לאיכות או לזמן משלוח.
          </p>
          <h2>עסקאות חיצוניות</h2>
          <p>
            כל רכישה נעשית ישירות בפלטפורמה החיצונית וכפופה לתנאיה ולתנאי המוכר.
            DealPilot אינו צד להזמנה ואינו מספק שירותי סליקה או משלוח.
          </p>
          <h2>מצב פיתוח</h2>
          <p>
            מסמך זה משקף את השירות הנוכחי. פרטי המפעיל וערוץ הקשר יושלמו לפני
            השקה ציבורית. אין בתוכן כדי לגרוע מזכויות שאינן ניתנות להתניה לפי
            הדין החל.
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
