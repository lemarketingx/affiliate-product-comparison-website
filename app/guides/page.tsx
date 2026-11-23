export const metadata = {
  title: "מדריכי קנייה חכמה מחו״ל | DealPilot",
  description: "מדריכי קנייה ב־AliExpress: התאמה לישראל, משלוח, מיסוי, אחריות ומוצרים שמומלץ לבדוק היטב לפני הזמנה.",
  alternates: { canonical: "/guides" },
};
import Link from "next/link";
import { PublicShell } from "../public-shell";
import { GUIDES } from "../../lib/preflight/guides";
import { visibility } from "../../lib/preflight/approvals";

export const dynamic = "force-dynamic";
export default function Guides() {
  const guides = GUIDES.filter((g) => visibility("guide:" + g.slug).visible);
  return (
    <PublicShell>
      <main id="main" className="fp-wrap">
        <article className="fp-prose">
          <span className="fp-kicker">מדריך לפני שקונים</span>
          <h1>
            קנייה טובה מתחילה
            <br />
            בכמה שאלות טובות.
          </h1>
          <p>
            מצאתם מוצר מסקרן? לפני המעבר לתשלום ב־AliExpress, הקדישו רגע לבדיקות
            האלה.
          </p>
          <h2>01 / בחרו את הגרסה המדויקת</h2>
          <p>
            תמונה יכולה להציג כמה דגמים. בדקו שהאפשרות שבחרתם כוללת את הגודל,
            הצבע, הכמות והאביזרים שאתם צריכים. אל תסתמכו על כותרת בלבד.
          </p>
          <h2>02 / השוו מחיר סופי</h2>
          <p>
            מחיר הקטלוג הוא תמונת מצב מהספק. בדקו בקופה את המטבע, המשלוח,
            התוספות והתנאים. קופון או הנחה רלוונטיים רק אם הם חלים בפועל על
            הבחירה שלכם.
          </p>
          <h2>03 / ודאו משלוח לכתובת שלכם</h2>
          <p>
            משלוח לישראל אינו מובטח לכל מוצר. אמתו את היעד, אמצעי המשלוח וההערכה
            המוצגת אצל המוכר. DealPilot אינו מספק התחייבות לזמן הגעה.
          </p>
          <h2>04 / קראו מעבר לציון</h2>
          <p>
            מספר הזמנות הוא סימן פעילות מהספק, ואינו בדיקת איכות. חפשו ביקורות
            מפורטות, תמונות שמתאימות לגרסה הרצויה ותיאור ברור של המגבלות.
          </p>
          <h2>05 / בדקו תנאי החזרה והתאמה</h2>
          <p>
            ודאו שאתם מבינים מי המוכר ומהם תנאי הרכישה וההחזרה. במוצרים חשמליים,
            לילדים או בעלי דרישות בטיחות, אל תסיקו התאמה או אישור ממראה המוצר.
          </p>
        </article>
        {guides.length > 0 && (
          <section className="fp-section" aria-labelledby="abroad-title">
            <div className="fp-section-head">
              <div>
                <span className="fp-kicker">קונים חכם מחו״ל</span>
                <h2 id="abroad-title">מדריכים קצרים, ממוקדים לישראל</h2>
              </div>
            </div>
            <ul className="fp-dests">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link className="fp-dest" href={"/guides/" + g.slug}>
                    <span className="fp-dest-code" dir="ltr">{g.code}</span>
                    <strong>{g.title}</strong>
                    <p>{g.summary}</p>
                    <span className="fp-dest-foot"><span>עודכן {g.updatedAt}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
