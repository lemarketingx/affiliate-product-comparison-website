export const metadata = {
  title: "גילוי נאות | DealPilot",
  alternates: { canonical: "/disclosure" },
};
import { PublicShell } from "../public-shell";
export default function Disclosure() {
  return (
    <PublicShell>
      <main id="main" className="fp-wrap">
        <article className="fp-prose">
          <h1>גילוי נאות: קישורי שותפים</h1>
          <p>
            חלק מקישורי הקנייה שמובילים ל־AliExpress הם קישורים מסחריים (קישורי שותפים).
            רכישה לאחר מעבר דרך קישור כזה עשויה לזכות את DealPilot בעמלה.
            המחיר הסופי ותנאי הרכישה מוצגים ב־AliExpress.
          </p>
          <h2>על הנתונים</h2>
          <p>
            מחיר, מטבע ומספר הזמנות מוצגים כפי שהתקבלו מהספק. אין התחייבות
            למחיר, לזמינות או למשלוח. איננו ממציאים ביקורות, דירוגים או מחירי
            עבר, ולא בדקנו כל מוצר בשימוש עצמאי.
          </p>
          <h2>הקנייה מתבצעת אצל המוכר</h2>
          <p>
            יש לבדוק את המחיר הסופי ותנאי העסקה ב־AliExpress. האחריות להזמנה,
            לאספקה ולהחזרה נקבעת מול הפלטפורמה והמוכר.
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
