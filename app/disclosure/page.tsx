export const metadata = {
  title: "גילוי שותפים | DealPilot",
  alternates: { canonical: "/disclosure" },
};
import { PublicShell } from "../public-shell";
export default function Disclosure() {
  return (
    <PublicShell>
      <main id="main" className="dp-container">
        <article className="dp-prose">
          <h1>גילוי נאות: קישורי שותפים</h1>
          <p>
            חלק מהקישורים באתר הם קישורי קידום שהתקבלו מ־AliExpress. אם תרכשו
            לאחר מעבר דרכם, ייתכן ש־DealPilot יקבל עמלה, בהתאם לתנאי תוכנית
            השותפים. עצם המעבר אינו מוכיח שהעסקה תזכה אותנו בעמלה.
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
