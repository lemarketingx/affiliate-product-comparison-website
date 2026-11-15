import Link from "next/link";
import { ArrowUpLeft, Plane } from "lucide-react";
import { PublicShell } from "../public-shell";
import { visibleTypes } from "../../lib/preflight";

export const dynamic = "force-dynamic";
export const metadata = { title: "יעדים: מה אתם צריכים? | DealPilot", alternates: { canonical: "/missions" } };

export default function Missions() {
  const types = visibleTypes();
  const groups = [...new Set(types.map((t) => t.group))];
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-section">
        <div className="fp-page-title">
          <span className="fp-kicker">לוח יעדים</span>
          <h1>לא קטגוריה. צורך.</h1>
          <p className="fp-lead">
            בחרו יעד וקבלו תדריך מלא: מה לקנות, מה לרוב לא בקופסה, איך לחפש באליאקספרס, מה לבדוק כדי שיתאים לישראל, ומתי עדיף לקנות כאן.
          </p>
          <Link className="fp-btn" href="/autopilot">לטייס האוטומטי <ArrowUpLeft size={18} /></Link>
        </div>
        {!types.length && (
          <div className="fp-empty"><h3>היעדים בבדיקה אחרונה</h3><p>התדריכים יפורסמו אחרי אישור התוכן.</p></div>
        )}
        {groups.map((g) => (
          <section key={g} className="fp-dest-group" aria-labelledby={"g-" + g}>
            <h2 id={"g-" + g} className="fp-dest-group-title"><Plane size={16} aria-hidden="true" /> {g}</h2>
            <ul className="fp-dests">
              {types.filter((t) => t.group === g).map((t) => (
                <li key={t.id}>
                  <Link className="fp-dest" href={"/missions/" + t.id}>
                    <span className="fp-dest-code" dir="ltr">TLV<i>→</i>{t.code}</span>
                    <strong>{t.name}</strong>
                    <p>{t.need}</p>
                    <span className="fp-dest-foot">
                      {t.status === "draft" ? <span className="fp-chip is-wait">טיוטה</span> : <span className="fp-chip is-go">מאושר</span>}
                      <span>לתדריך <ArrowUpLeft size={15} aria-hidden="true" /></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </PublicShell>
  );
}
