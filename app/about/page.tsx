export const metadata = {
  title: "אודות | DealPilot",
  alternates: { canonical: "/about" },
};
import { PublicShell } from "../public-shell";
export default function About() {
  return (
    <PublicShell>
      <main id="main" className="dp-container">
        <article className="dp-prose">
          <span className="dp-eyebrow">CURIOUS BY DESIGN</span>
          <h1>להכניס קצת גילוי ליום־יום.</h1>
          <p>
            DealPilot מרכז מוצרים מ־AliExpress בקטגוריות שימושיות, כדי שיהיה קל
            לחפש, להשוות ולבדוק מה מתאים לכם.
          </p>
          <h2>מה אנחנו עושים</h2>
          <p>
            אנחנו מציגים נתונים שהתקבלו מממשק הספק, עם מחיר במטבע המקורי ומידע
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
            זוהי גרסת פיתוח. נתוני מוצרים מתקבלים מהספק ועשויים להשתנות; משלוח
            לישראל וייחוס עמלות מחייבים אימות נוסף.
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
