export const metadata = {
  title: "איך DealPilot עוזר לקנות עם יותר מידע | אודות",
  description: "על DealPilot: אתר עצמאי שמרכז מוצרי מותגים מ־AliExpress, בדיקות מחיר והערכת עלויות יבוא לישראל.",
  alternates: { canonical: "/about" },
};
import { PublicShell } from "../public-shell";
export default function About() {
  return (
    <PublicShell>
      <main id="main" className="fp-wrap">
        <article className="fp-prose">
          <span className="fp-kicker">קונים עם יותר מידע</span>
          <h1>לגלות מוצרים. לבדוק לפני שקונים.</h1>
          <p>
            DealPilot הוא אתר שותפים עצמאי בעברית, שמרכז מוצרים מזוהים של מותגים מ־AliExpress ועוזר לבדוק מחיר בשקלים, נתוני ספק ואומדן עלויות יבוא לישראל.
          </p>
          <h2>מה אנחנו עושים</h2>
          <p>
            אנחנו מציגים נתונים שהתקבלו מממשק הספק, עם מחיר בשקלים וזמן בדיקה ומידע
            על מה שעדיין לא ידוע. איננו מציגים התנסות אישית או המלצה מקצועית שלא
            בוצעו.
          </p>
          <h2>איפה קונים</h2>
          <p>
            ההזמנה והתשלום מתבצעים ב־AliExpress. DealPilot אינו המוכר ואינו
            מפעיל משלוחים, סליקה או החזרות.
          </p>
          <h2>מצב האתר</h2>
          <p>
            הקטלוג מתעדכן בהדרגה. נתוני מוצרים מתקבלים מהספק ועשויים להשתנות; משלוח
            לישראל וייחוס עמלות מחייבים אימות נוסף.
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
