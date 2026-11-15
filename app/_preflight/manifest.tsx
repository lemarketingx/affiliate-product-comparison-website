import { Search } from "lucide-react";
import type { PlanItem } from "../../lib/preflight/plan";
import { aliSearchUrl } from "../../lib/preflight/search";
import { Terms } from "./term";

export const STATUS_LABEL = {
  in_box: "בדרך כלל בקופסה",
  required: "לא בקופסה · חובה",
  recommended: "מומלץ",
  optional: "אופציונלי",
} as const;

/** The equipment manifest, styled like a baggage list on a boarding pass. */
export function Manifest({ items, code, title = "רשימת ציוד לטיסה" }: { items: PlanItem[]; code: string; title?: string }) {
  const required = items.filter((i) => i.status === "required" && !i.have).length;
  return (
    <section className="fp-manifest" aria-labelledby={"manifest-" + code}>
      <header className="fp-manifest-head">
        <div>
          <span className="fp-kicker">מניפסט ציוד</span>
          <h2 id={"manifest-" + code}>{title}</h2>
        </div>
        <span className="fp-manifest-count" dir="rtl">
          <strong dir="ltr">{String(required).padStart(2, "0")}</strong> פריטי חובה שלא בקופסה
        </span>
      </header>
      <ol className="fp-manifest-list">
        {items.map((item) => {
          const state = item.have ? "have" : item.status;
          return (
            <li key={item.id} className={"is-" + state}>
              <span className="fp-manifest-tag">{item.have ? "יש לכם" : STATUS_LABEL[item.status]}</span>
              <div className="fp-manifest-body">
                <strong>{item.label}</strong>
                {item.why && <p>{item.why}</p>}
                {item.terms && <Terms ids={item.terms} />}
              </div>
              {item.search && !item.have && item.status !== "in_box" && (
                <a
                  className="fp-manifest-search"
                  href={aliSearchUrl(item.search)}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={"חיפוש באליאקספרס: " + item.label + " (קישור רגיל)"}
                >
                  <Search size={15} aria-hidden="true" /> <span dir="ltr">{item.search}</span>
                </a>
              )}
            </li>
          );
        })}
      </ol>
      <p className="fp-fine">
        &quot;בדרך כלל&quot; אינו התחייבות לגבי מוצר מסוים. בדקו תמיד בתיאור המוכר מה כלול בגרסה שבחרתם.
      </p>
    </section>
  );
}
