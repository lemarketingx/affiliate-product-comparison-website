import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, Plane } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { categories } from "../lib/dealpilot/categories";
import { formatMoney } from "../lib/dealpilot/urls";
import { evaluateEligibility } from "../lib/aliexpress/quality";
import { PublicShell, CategoryLinks } from "./public-shell";
import LiveCatalog from "./live-catalog";
import FlightClock from "./flight-clock";
import { flightCode, gateCode } from "./flight-bits";
import { visibleTypes } from "../lib/preflight";

function AutopilotPanel() {
  const types = visibleTypes();
  if (!types.length) return null;
  const featured = ["security-recorder", "wireless-camera", "charger", "smart-home", "dashcam", "clothing"]
    .map((id) => types.find((t) => t.id === id))
    .filter((t): t is (typeof types)[number] => !!t);
  return (
    <section className="fp-ap-home" aria-labelledby="ap-home-title">
      <div className="fp-wrap fp-ap-home-grid">
        <div>
          <span className="fp-kicker fp-kicker-light">טייס אוטומטי לקנייה</span>
          <h2 id="ap-home-title">יודעים מה הבעיה, לא יודעים מה לחפש?</h2>
          <p>
            ספרו לנו מה אתם צריכים, ונחזיר תוכנית קנייה: מה לקנות, מה לרוב לא בקופסה (כמו הדיסק שלא מגיע עם המקליט), איך מחפשים את זה
            באנגלית, אם זה מתאים לישראל, וכמה זה עולה באמת.
          </p>
        </div>
        <div className="fp-ap fp-ap-mini">
          <div className="fp-ap-bar" aria-hidden="true"><span>AUTOPILOT</span><span>TLV→???</span><span>מוכן</span></div>
          <form action="/autopilot" className="fp-ap-ask" role="search">
            <label className="fp-sr" htmlFor="home-ap-q">מה אתם צריכים?</label>
            <input id="home-ap-q" name="q" maxLength={120} placeholder="למשל: מצלמה לחצר בלי חשמל" autoComplete="off" />
            <button className="fp-btn" type="submit">המראה <ArrowLeft size={18} aria-hidden="true" /></button>
          </form>
          <div className="fp-ap-groups">
            <fieldset>
              <legend>יעדים נפוצים</legend>
              {featured.map((t) => (
                <Link key={t.id} className="fp-ap-chip" href={"/autopilot?t=" + t.id}>{t.name}</Link>
              ))}
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}

const checks = [
  ["גרסה מדויקת", "צבע, גודל, כמות ואביזרים: בוחרים את מה שצריך."],
  ["מחיר סופי", "משווים בקופה, עם משלוח ותוספות, לא רק בכותרת."],
  ["משלוח לישראל", "מוודאים יעד, שיטת משלוח והערכת זמן אצל המוכר."],
  ["תנאי החזרה", "יודעים מי המוכר ומה קורה אם משהו לא מתאים."],
] as const;

function DepartureBoard({ snapshot }: { snapshot: CatalogSnapshot }) {
  const gateOf = (slug: string) =>
    gateCode(Math.max(0, categories.findIndex((c) => c.slug === slug)));
  const rows = snapshot.items.slice(0, 6);
  return (
    <div className="fp-board" aria-label="לוח המראות: מוצרים אחרונים בקטלוג">
      <div className="fp-board-head">
        <span>
          <Plane size={16} aria-hidden="true" /> המראות
          <em dir="ltr">DEPARTURES</em>
        </span>
        <FlightClock />
      </div>
      <div className="fp-board-cols" aria-hidden="true">
        <span>שער</span>
        <span>מוצר</span>
        <span>מחיר</span>
        <span>סטטוס</span>
      </div>
      <ol className="fp-board-rows">
        {rows.length
          ? rows.map((p, i) => {
              const verified = evaluateEligibility(p).eligible;
              return (
                <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
                  <Link href={"/products/" + p.id}>
                    <span className="fp-flap fp-flap-gate" dir="ltr">
                      {gateOf(p.categorySlug)}
                    </span>
                    <span className="fp-flap fp-flap-title" dir="auto">
                      {p.title}
                      <small dir="ltr">{flightCode(p.id)}</small>
                    </span>
                    <span className="fp-flap fp-flap-price" dir="auto">
                      {formatMoney(p.price, p.currency)}
                    </span>
                    <span
                      className={
                        "fp-flap fp-status " +
                        (verified ? "is-go" : "is-wait")
                      }
                    >
                      {verified ? "מאומת" : "בבדיקה"}
                    </span>
                  </Link>
                </li>
              );
            })
          : categories.slice(0, 6).map((c, i) => (
              <li key={c.slug} style={{ "--i": i } as React.CSSProperties}>
                <Link href={"/categories/" + c.slug}>
                  <span className="fp-flap fp-flap-gate" dir="ltr">
                    {gateCode(i)}
                  </span>
                  <span className="fp-flap fp-flap-title">{c.label}</span>
                  <span className="fp-flap fp-flap-price">—</span>
                  <span className="fp-flap fp-status is-hold">ממתין</span>
                </Link>
              </li>
            ))}
      </ol>
      <p className="fp-board-foot">
        {rows.length
          ? "נתוני ספק בשקלים. ״בבדיקה״ = דירוג, ביקורות ומשלוח טרם אומתו."
          : "הקטלוג ממתין לחיבור. אין טיסות מוצגות, ואנחנו לא ממציאים אותן."}
      </p>
    </div>
  );
}

export default function DealPilotHome({
  snapshot,
}: {
  snapshot: CatalogSnapshot;
}) {
  return (
    <PublicShell>
      <main id="main">
        <section className="dp-hero fp-hero">
          <div className="fp-wrap fp-hero-grid">
            <div className="fp-hero-copy">
              <span className="fp-kicker">
                <span className="fp-dot" /> עלייה למטוס פתוחה
              </span>
              <h1>
                מגלים מוצרים חכמים.
                <em>בודקים. ממריאים.</em>
              </h1>
              <p>
                אתר הגילוי היחיד שעושה איתכם צ׳ק־ליסט לפני כל קנייה ב־AliExpress.
                גאדג׳טים, בית, רכב ופנאי, עם מידע ברור על מה נבדק ומה עוד לא.
              </p>
              <div className="fp-actions">
                <Link className="fp-btn" href="/deals">
                  גלו מוצרים <ArrowLeft size={19} />
                </Link>
                <Link className="fp-btn fp-btn-ghost" href="/categories">
                  לשערי הקטגוריות
                </Link>
              </div>
              <dl className="fp-hero-facts">
                <div>
                  <dt>מחירים</dt>
                  <dd>בשקלים</dd>
                </div>
                <div>
                  <dt>שערים</dt>
                  <dd dir="ltr">{String(categories.length).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>בדיקות לפני קנייה</dt>
                  <dd dir="ltr">04</dd>
                </div>
              </dl>
            </div>
            <DepartureBoard snapshot={snapshot} />
          </div>
        </section>

        <AutopilotPanel />

        <section className="fp-preflight" aria-labelledby="preflight-title">
          <div className="fp-wrap">
            <div className="fp-preflight-head">
              <span className="fp-kicker fp-kicker-light">צ׳ק־ליסט טרום המראה</span>
              <h2 id="preflight-title">ארבע בדיקות. אפס הפתעות בקופה.</h2>
            </div>
            <ol className="fp-preflight-list">
              {checks.map(([t, d], i) => (
                <li key={t}>
                  <span dir="ltr">0{i + 1}</span>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="fp-section fp-wrap">
          <div className="fp-section-head">
            <div>
              <span className="fp-kicker">מאיפה ממריאים?</span>
              <h2>בחרו שער.</h2>
            </div>
            <Link className="fp-link" href="/categories">
              לכל הקטגוריות <ArrowUpLeft size={17} />
            </Link>
          </div>
          <CategoryLinks />
        </section>

        <LiveCatalog snapshot={snapshot} compact />

        <section className="fp-wrap fp-section">
          <div className="fp-guide-pass">
            <div className="fp-guide-main">
              <span className="fp-kicker">מדריך הקנייה</span>
              <h2>
                הדיל הטוב מתחיל
                <br />
                בבדיקה קטנה.
              </h2>
              <p>
                חמש שאלות שכדאי לשאול לפני שמשלמים. קצר, ברור, בלי מבצעים
                מזויפים.
              </p>
              <Link className="fp-btn" href="/guides">
                למדריך הקנייה <ArrowLeft size={18} />
              </Link>
            </div>
            <div className="fp-guide-stub" aria-hidden="true">
              <span>נוסע/ת</span>
              <strong>קונים חכם</strong>
              <span>יעד</span>
              <strong>החלטה טובה</strong>
              <span>מושב</span>
              <strong dir="ltr">01A</strong>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
