"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState } from "react";
import {
  Search,
  Check,
  X,
  Copy,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import type {
  CatalogSnapshot,
  CatalogItem,
} from "../../lib/aliexpress/catalog";
import { formatMoney, safeAliUrl } from "../../lib/dealpilot/urls";

type Review = {
  status: "needs_review" | "approved" | "rejected";
  title: string;
  description: string;
};
type Reviews = Record<string, Review>;
type LocalCandidate = { product: CatalogItem; fetchedAt: string | null };
const WorkbenchContext = createContext<{
  reviews: Reviews;
  setReviews: React.Dispatch<React.SetStateAction<Reviews>>;
  candidates: Record<string, LocalCandidate>;
  intake: (snapshot: CatalogSnapshot) => void;
} | null>(null);
export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Reviews>({});
  const [candidates, setCandidates] = useState<Record<string, LocalCandidate>>(
    {},
  );
  function intake(snapshot: CatalogSnapshot) {
    setCandidates((previous) => {
      const next = { ...previous };
      for (const product of snapshot.items)
        next[product.id] = { product, fetchedAt: snapshot.fetchedAt };
      return next;
    });
    // A new supplier result must be reviewed again, even when its ID was previously approved.
    setReviews((previous) => {
      const next = { ...previous };
      for (const product of snapshot.items)
        if (next[product.id])
          next[product.id] = { ...next[product.id], status: "needs_review" };
      return next;
    });
  }
  return (
    <WorkbenchContext.Provider
      value={{ reviews, setReviews, candidates, intake }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}
export function useCandidateIntake() {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error("Workbench provider missing");
  return context.intake;
}
const labels = {
  needs_review: "ממתין לבדיקה",
  approved: "אושר בלשונית",
  rejected: "נדחה בלשונית",
};
function checks(product: CatalogItem) {
  return [
    Boolean(product.price && Number(product.price) > 0 && product.currency),
    Boolean(safeAliUrl(product.image, true)),
    Boolean(safeAliUrl(product.productUrl)),
    Boolean(safeAliUrl(product.affiliateUrl)),
  ];
}

export default function ProductWorkbench({
  snapshot,
  mode = "review",
}: {
  snapshot: CatalogSnapshot;
  mode?: "review" | "content";
}) {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error("Workbench provider missing");
  const { reviews, setReviews, candidates } = context;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [channel, setChannel] = useState("telegram");
  const [feedback, setFeedback] = useState("");
  const mergedCandidates = useMemo(() => {
    const merged = new Map(
      snapshot.items.map((product) => [
        product.id,
        { product, fetchedAt: snapshot.fetchedAt },
      ]),
    );
    for (const [id, candidate] of Object.entries(candidates)) {
      const existing = merged.get(id);
      if (
        !existing ||
        !existing.fetchedAt ||
        (candidate.fetchedAt && candidate.fetchedAt >= existing.fetchedAt)
      )
        merged.set(id, candidate);
    }
    return merged;
  }, [snapshot.items, snapshot.fetchedAt, candidates]);
  const items = useMemo(
    () =>
      [...mergedCandidates.values()]
        .map((candidate) => candidate.product)
        .filter((item) => {
          const review = reviews[item.id];
          if (mode === "content" && review?.status !== "approved") return false;
          return (
            (status === "all" ||
              (review?.status ?? "needs_review") === status) &&
            `${review?.title ?? item.title} ${item.category}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase())
          );
        }),
    [mergedCandidates, reviews, query, status, mode],
  );
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedFetchedAt = selected
    ? mergedCandidates.get(selected.id)?.fetchedAt
    : null;
  const current: Review | null = selected
    ? (reviews[selected.id] ?? {
        status: "needs_review",
        title: selected.title,
        description: "",
      })
    : null;
  const completeness = selected ? checks(selected) : [];
  const ready = completeness.length === 4 && completeness.every(Boolean);
  function update(patch: Partial<Review>) {
    if (!selected || !current) return;
    setReviews((previous) => ({
      ...previous,
      [selected.id]: { ...current, ...patch },
    }));
    setFeedback("");
  }
  const draft =
    selected && current?.status === "approved"
      ? [
          channel === "shorts"
            ? "תסריט מוצע לבדיקה — לא וידאו שנוצר\nHook: בואו נכיר מוצר מתוך קטלוג AliExpress."
            : current.title,
          channel === "shorts"
            ? `סצנה 1: הציגו את תמונת הספק, בכפוף לזכויות שימוש.\nטקסט על המסך: ${current.title}\nסצנה 2: הציגו את המחיר שהתקבל: ${formatMoney(selected.price, selected.currency)}.\nסצנה 3: הפנו לבדיקת פרטי המוכר, המחיר והמשלוח ב־AliExpress.`
            : "מוצר מתוך קטלוג AliExpress.",
          `מחיר לפי תשובת הספק: ${formatMoney(selected.price, selected.currency)}`,
          selectedFetchedAt
            ? `זמן נתוני הספק: ${selectedFetchedAt}`
            : "זמן עדכון הספק אינו זמין.",
          `לפרטים אצל המוכר: ${safeAliUrl(selected.affiliateUrl) ?? "קישור קידום אינו זמין"}`,
          "גילוי נאות: זהו קישור שותפים; ייתכן שנקבל עמלה ללא עלות נוספת לכם. המחיר, המלאי, המשלוח וההתאמה לישראל טעונים בדיקה ב־AliExpress לפני רכישה.",
          channel === "instagram" ? "#קישור_שותפים #AliExpress" : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setFeedback("הטיוטה הועתקה. יש לבדוק אותה לפני פרסום.");
    } catch {
      setFeedback("ההעתקה אינה זמינה בדפדפן. אפשר להוריד את הטקסט.");
    }
  }
  function download() {
    if (!selected || !draft) return;
    const url = URL.createObjectURL(
      new Blob([draft], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `dealpilot-${selected.id}-${channel}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("קובץ הטיוטה נוצר להורדה. הוא לא פורסם לערוץ.");
  }
  return (
    <>
      <div className="dp-notice">
        <strong>עבודה מקומית, ללא שמירה בשרת.</strong> תוצאות גילוי והחלטות
        נשמרות בזיכרון הלשונית במעבר בין מסכי הניהול. רענון או יציאה מוחקים
        אותן. אין שינוי בקטלוג הציבורי.
      </div>
      <div className="dp-filter-bar">
        <label className="dp-field">
          <span>חיפוש בקטלוג</span>
          <div className="dp-input-icon">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="שם או קטגוריה"
            />
          </div>
        </label>
        {mode === "review" && (
          <label className="dp-field">
            <span>מצב עבודה</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">כל המוצרים</option>
              <option value="needs_review">ממתינים לבדיקה</option>
              <option value="approved">אושרו בלשונית</option>
              <option value="rejected">נדחו בלשונית</option>
            </select>
          </label>
        )}
        <span className="dp-muted">{items.length} מוצרים בתצוגה</span>
      </div>
      {!snapshot.available && (
        <div className="dp-panel" role="status">
          <h2>הקטלוג אינו זמין כרגע</h2>
          <p>
            {mergedCandidates.size
              ? "מוצגים מועמדים זמניים מתוצאות גילוי קודמות בלשונית. יש לבדוק את תאריך נתוני הספק."
              : "לא ניתן להכין מועמדים ללא נתוני ספק. בדקו את מצב החיבור בהגדרות."}
          </p>
          <Link href="/admin/settings" className="dp-btn-secondary">
            למצב החיבורים
          </Link>
        </div>
      )}
      {(snapshot.available || mergedCandidates.size > 0) && !items.length && (
        <div className="dp-panel">
          <FileText size={30} />
          <h2>
            {mode === "content"
              ? "אין מוצרים מאושרים בלשונית"
              : "אין תוצאות בסינון הזה"}
          </h2>
          <p>
            {mode === "content"
              ? "בחרו מוצר, בדקו את הפרטים ואשרו אותו בעבודה המקומית. לאחר מכן ניתן להכין תבנית תוכן."
              : "נסו חיפוש או מצב עבודה אחר."}
          </p>
          {mode === "content" && (
            <Link href="/admin/products" className="dp-btn">
              לבדיקת מוצרים
            </Link>
          )}
        </div>
      )}
      {selected && current && (
        <div className="dp-workbench">
          <section className="dp-panel">
            <h2>
              {mode === "content" ? "מוצרים מאושרים בלשונית" : "תור המועמדים"}
            </h2>
            <div className="dp-candidate-list">
              {items.map((item) => (
                <button
                  className={`dp-candidate ${selected.id === item.id ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setConfirmed(false);
                    setFeedback("");
                  }}
                >
                  <span dir="auto">
                    {reviews[item.id]?.title ?? item.title}
                  </span>
                  <small>
                    {item.category} ·{" "}
                    {labels[reviews[item.id]?.status ?? "needs_review"]}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <section className="dp-panel">
            <div className="dp-review-heading">
              <h2>{mode === "content" ? "הכנת טיוטה" : "בדיקת מועמד"}</h2>
              <span className="dp-tag">{labels[current.status]}</span>
            </div>
            <div className="dp-review-product">
              {selected.image && (
                <img
                  src={selected.image}
                  alt={selected.title}
                  width="128"
                  height="128"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              )}
              <div>
                <h3 dir="auto">{selected.title}</h3>
                <strong dir="auto">
                  {formatMoney(selected.price, selected.currency)}
                </strong>
                <p className="dp-muted">
                  {selected.category} · מזהה {selected.id}
                </p>
              </div>
            </div>
            <p className="dp-muted">
              זמן נתוני הספק:{" "}
              {selectedFetchedAt &&
              Number.isFinite(Date.parse(selectedFetchedAt)) ? (
                <time dateTime={selectedFetchedAt}>
                  {new Date(selectedFetchedAt).toLocaleString("he-IL", {
                    timeZone: "Asia/Jerusalem",
                  })}
                </time>
              ) : (
                "לא זמין"
              )}
              {candidates[selected.id] &&
                " · מועמד גילוי מקומי, ללא שמירה מתמשכת"}
            </p>
            <div className="dp-kpi-grid">
              <div className="dp-kpi">
                <span>שלמות נתוני בסיס</span>
                <strong>
                  {Math.round((completeness.filter(Boolean).length / 4) * 100)}%
                </strong>
                <small>מחיר ומטבע, תמונה, מקור, קידום</small>
              </div>
              <div className="dp-kpi">
                <span>ביקוש לפי הספק</span>
                <strong>
                  {selected.orders === null
                    ? "לא זמין"
                    : selected.orders.toLocaleString("he-IL")}
                </strong>
                <small>נתון הזמנות מדווח · אינו תחזית</small>
              </div>
              <div className="dp-kpi">
                <span>שיעור עמלה מדווח</span>
                <strong>{selected.commissionRate ?? "לא זמין"}</strong>
                <small>תיאורטי · אינו עמלה מאושרת</small>
              </div>
            </div>
            <div className="dp-review-links">
              {safeAliUrl(selected.productUrl) && (
                <a
                  className="dp-btn-secondary"
                  href={selected.productUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  עמוד המקור <ExternalLink size={15} />
                </a>
              )}
              {safeAliUrl(selected.affiliateUrl) && (
                <a
                  className="dp-btn-secondary"
                  href={selected.affiliateUrl!}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  קישור קידום מהספק <ExternalLink size={15} />
                </a>
              )}
            </div>
            <p className="dp-muted">
              משלוח לישראל, זמן אספקה, מלאי, זכאות לעמלה ואיכות המוצר טרם אומתו.
              לא התקבלו נתוני ביקורות מאומתים.
            </p>
            {!ready && (
              <div className="dp-notice">
                האישור חסום:{" "}
                {completeness
                  .map((ok, index) =>
                    ok
                      ? null
                      : [
                          "מחיר ומטבע",
                          "תמונה תקינה",
                          "קישור מקור",
                          "קישור קידום",
                        ][index],
                  )
                  .filter(Boolean)
                  .join(" · ")}
                .
              </div>
            )}
            {mode === "review" ? (
              <>
                <label className="dp-field">
                  <span>כותרת לעריכה</span>
                  <input
                    dir="auto"
                    minLength={3}
                    maxLength={180}
                    value={current.title}
                    onChange={(e) => {
                      update({ title: e.target.value, status: "needs_review" });
                      setConfirmed(false);
                    }}
                  />
                </label>
                <label className="dp-field">
                  <span>הערות ותיאור לבדיקה פנימית</span>
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={current.description}
                    onChange={(e) => {
                      update({
                        description: e.target.value,
                        status: "needs_review",
                      });
                      setConfirmed(false);
                    }}
                    placeholder="רק מידע שנבדק מול המקור; אין להמציא יתרונות או חוויית שימוש"
                  />
                </label>
                <p className="dp-muted">
                  ההערות הן שדה עריכה פנימי ואינן מוזרקות אוטומטית לתבניות
                  התוכן.
                </p>
                <label className="dp-review-check">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />{" "}
                  בדקתי את המקור ואת החוסרים. אישור מקומי זה נועד להכנת טיוטה
                  בלבד.
                </label>
                <div className="dp-review-links">
                  <button
                    className="dp-btn"
                    disabled={
                      !ready || !confirmed || current.title.trim().length < 3
                    }
                    onClick={() => update({ status: "approved" })}
                  >
                    <Check size={17} />
                    אישור מקומי
                  </button>
                  <button
                    className="dp-btn-secondary"
                    onClick={() => update({ status: "rejected" })}
                  >
                    <X size={17} />
                    דחייה מקומית
                  </button>
                  {current.status === "approved" && (
                    <Link className="dp-btn-secondary" href="/admin/content">
                      להכנת תוכן
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <label className="dp-field">
                  <span>פורמט טיוטה</span>
                  <select
                    value={channel}
                    onChange={(e) => {
                      setChannel(e.target.value);
                      setFeedback("");
                    }}
                  >
                    <option value="telegram">Telegram</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram Caption</option>
                    <option value="shorts">
                      TikTok / YouTube Shorts — תסריט בלבד
                    </option>
                  </select>
                </label>
                <div className="dp-notice">
                  תבנית קבועה המבוססת על נתוני המוצר · אינה יצירת AI · אינה
                  נשלחת לאף ערוץ
                </div>
                <label className="dp-field">
                  <span>תוכן לבדיקה</span>
                  <textarea dir="auto" rows={14} readOnly value={draft} />
                </label>
                <div className="dp-review-links">
                  <button className="dp-btn" onClick={copy}>
                    <Copy size={17} />
                    העתקת טיוטה
                  </button>
                  <button className="dp-btn-secondary" onClick={download}>
                    <Download size={17} />
                    הורדת טקסט
                  </button>
                </div>
              </>
            )}
            {feedback && <p role="status">{feedback}</p>}
          </section>
        </div>
      )}
    </>
  );
}
