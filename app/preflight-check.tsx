"use client";
import { useState } from "react";
import { Check, PlaneTakeoff } from "lucide-react";

const ITEMS = [
  ["version", "בחרתי את הגרסה המדויקת", "צבע, מידה, כמות ואביזרים כלולים."],
  ["price", "בדקתי את המחיר הסופי בקופה", "כולל משלוח, מסים ותוספות."],
  ["shipping", "וידאתי משלוח לכתובת שלי בישראל", "יעד, שיטת משלוח והערכת זמן."],
  ["returns", "קראתי ביקורות ותנאי החזרה", "מי המוכר ומה קורה אם זה לא מתאים."],
] as const;

/* A personal checklist. It never blocks the outbound link; it only helps. */
export default function PreflightCheck() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const count = ITEMS.filter(([k]) => done[k]).length;
  const ready = count === ITEMS.length;
  return (
    <section className={"fp-check" + (ready ? " is-ready" : "")} aria-labelledby="fp-check-title">
      <header>
        <h2 id="fp-check-title">צ׳ק־ליסט טרום המראה</h2>
        <span dir="ltr" className="fp-check-count">
          {count}/{ITEMS.length}
        </span>
      </header>
      <div className="fp-check-bar" aria-hidden="true">
        <i style={{ width: (count / ITEMS.length) * 100 + "%" }} />
      </div>
      <ul>
        {ITEMS.map(([k, label, hint]) => (
          <li key={k}>
            <label>
              <input
                type="checkbox"
                checked={!!done[k]}
                onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))}
              />
              <span className="fp-check-box" aria-hidden="true">
                <Check size={14} strokeWidth={3} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="fp-check-msg" role="status">
        {ready ? (
          <>
            <PlaneTakeoff size={17} /> מוכנים להמראה. ההחלטה שלכם.
          </>
        ) : (
          "הסימונים נשמרים רק אצלכם בדפדפן, לרגע הזה."
        )}
      </p>
    </section>
  );
}
