import Link from "next/link";
import { PublicShell } from "../public-shell";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { CATALOG_POLICY, REJECT_LABELS, type RejectReason } from "../../lib/aliexpress/catalog-build";
import { getBannerSnapshot, type BannerSnapshot } from "../../lib/aliexpress/banners";

export const dynamic = "force-dynamic";
export const metadata = { title: "איך נבנה הקטלוג | DealPilot", robots: { index: false } };
const fmt = (n: number) => n.toLocaleString("he-IL");

/** Transparent build report: fetched, rejected (and why) and actually published. */
export default async function CatalogStatus() {
  const snapshot = await getCatalog();
  const r = snapshot.report;
  let banners: BannerSnapshot | null = null;
  try {
    banners = await Promise.race([getBannerSnapshot(), new Promise<null>((res) => setTimeout(() => res(null), 3000))]);
  } catch {
    banners = null;
  }
  const reasons = new Map<string, number>();
  for (const b of banners?.banners ?? []) if (b.status !== "published") reasons.set(b.reason ?? b.status, (reasons.get(b.reason ?? b.status) ?? 0) + 1);
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-section">
        <article className="fp-report">
          <div>
            <span className="fp-kicker">דוח קטלוג</span>
            <h1 className="fp-catalog-title">איך נבנה הקטלוג</h1>
            <p className="fp-lead">
              מספרים אמיתיים מהשליפה האחרונה. אנחנו מפרסמים רק מוצרים עם יותר מ־{fmt(CATALOG_POLICY.minimumReportedSalesExclusive)} מכירות
              מדווחות, מחיר בשקלים, כותרת בעברית, תמונה, קישור מוצר וקישור שותפים תקין. לא משלימים את היעד במוצרים חלשים או מומצאים.
            </p>
          </div>
          {!r ? (
            <div className="fp-empty">
              <h3>{snapshot.available ? "אין דוח זמין" : "הקטלוג אינו מחובר כרגע"}</h3>
              <p>כשהחיבור ל־AliExpress פעיל, יוצגו כאן הנתונים של השליפה האחרונה.</p>
            </div>
          ) : (
            <>
              <dl className="fp-report-kpis">
                <div><dt>שורות שהתקבלו מה־API</dt><dd>{fmt(r.rawRows)}</dd></div>
                <div><dt>מוצרים ייחודיים</dt><dd>{fmt(r.uniqueProducts)}</dd></div>
                <div><dt>נפסלו</dt><dd>{fmt(r.rejectedTotal)}</dd></div>
                <div className="is-pub"><dt>פורסמו בפועל (יעד {fmt(r.target)})</dt><dd>{fmt(r.published)}</dd></div>
              </dl>
              {r.shortfall.length > 0 && (
                <div className="fp-notice is-wait fp-shortfall">
                  <strong>למה עדיין אין {fmt(r.target)}?</strong>
                  <ul>{r.shortfall.map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              )}
              <section>
                <h2>סיבות פסילה</h2>
                <div className="fp-report-scroll">
                  <table>
                    <thead><tr><th>סיבה</th><th>סיבה ראשונה</th><th>כל המקרים</th></tr></thead>
                    <tbody>
                      {(Object.keys(REJECT_LABELS) as RejectReason[]).map((k) => (
                        <tr key={k}><td>{REJECT_LABELS[k]}</td><td className="num">{fmt(r.rejectedPrimary[k] ?? 0)}</td><td className="num">{fmt(r.rejectedAll[k] ?? 0)}</td></tr>
                      ))}
                      <tr><td>כפילויות בין ביטויי חיפוש (הוסרו לפני הסינון)</td><td className="num">{fmt(r.duplicates)}</td><td className="num">—</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="fp-fine">
                  מוצר יכול להיפסל מכמה סיבות; &quot;סיבה ראשונה&quot; סופרת כל מוצר פעם אחת. לצורך השוואה, מוצרים שעומדים בכל שאר התנאים: מעל 500 מכירות {fmt(r.salesBands.over500)}, מעל 1,000 {fmt(r.salesBands.over1000)}, מעל 5,000 {fmt(r.salesBands.over5000)}.
                </p>
              </section>
              <section>
                <h2>שליפה מה־API</h2>
                <div className="fp-report-scroll">
                  <table>
                    <tbody>
                      <tr><td>עמודים מתוכננים (8 קטגוריות × ביטויים × עד {CATALOG_POLICY.maxPagesPerTerm} עמודים)</td><td className="num">{fmt(r.planned)}</td></tr>
                      <tr><td>עמודים שהתקבלו (כולל מהמטמון)</td><td className="num">{fmt(r.pagesFetched)}</td></tr>
                      <tr><td>עמודים שממתינים לשליפה בביקורים הבאים</td><td className="num">{fmt(r.pagesPending)}</td></tr>
                      <tr><td>עמודים שנכשלו</td><td className="num">{fmt(r.pagesFailed)}</td></tr>
                      <tr><td>עמודים שדולגו כי הביטוי מוצה</td><td className="num">{fmt(r.pagesSkippedExhausted)}</td></tr>
                      <tr><td>עמודים שדולגו כי כבר נמצאו מספיק מוצרים</td><td className="num">{fmt(r.pagesSkippedTargetMet)}</td></tr>
                      <tr><td>גודל עמוד שנוסה / שהתקבל</td><td className="num" dir="ltr">{r.pageSize.tried.join(", ") || "—"} / {r.pageSize.accepted ?? "—"}</td></tr>
                      <tr><td>עצירה בגלל מגבלת API</td><td className="num">{r.quotaStopped ? "כן" : "לא"}</td></tr>
                      {Object.entries(r.errorCodes).map(([code, n]) => (
                        <tr key={code}><td dir="ltr">{code}</td><td className="num">{fmt(n)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="fp-fine">
                  נבנה: {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(r.builtAt))}. כל עמוד
                  נשמר במטמון 6–10 שעות. ביקור באתר מפעיל לכל היותר מספר קטן של קריאות חדשות, כך שהקטלוג נבנה בהדרגה ולא חורג ממכסות.
                </p>
              </section>
              {r.totals.length > 0 && (
                <section>
                  <h2>ביטויי חיפוש</h2>
                  <div className="fp-report-scroll">
                    <table>
                      <thead><tr><th>קטגוריה</th><th>ביטוי</th><th>סה&quot;כ תוצאות לפי הספק</th></tr></thead>
                      <tbody>
                        {r.totals.map((t) => (
                          <tr key={t.category + t.term}><td>{t.category}</td><td dir="ltr">{t.term}</td><td className="num">{t.totalRecordCount === null ? "לא דווח" : fmt(t.totalRecordCount)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
          <section>
            <h2>באנרים וקמפיינים רשמיים</h2>
            {!banners ? (
              <p className="fp-lead">בדיקת הבאנרים עדיין רצה ברקע. רעננו בעוד רגע.</p>
            ) : (
              <div className="fp-report-scroll">
                <table>
                  <tbody>
                    <tr><td>חיבור ל־Affiliate API</td><td className="num">{banners.apiConfigured ? "מוגדר" : "לא מוגדר"}</td></tr>
                    <tr><td>מזהה מעקב (ALIEXPRESS_TRACKING_ID) בשרת</td><td className="num">{banners.trackingConfigured ? "מוגדר" : "חסר: אף באנר לא יפורסם"}</td></tr>
                    <tr><td>קמפיינים שהחזיר featuredpromo.get</td><td className="num">{fmt(banners.promosFound)}</td></tr>
                    <tr><td>באנרים שפורסמו (קישור שותפים תקין ומזהה מעקב תואם)</td><td className="num">{fmt(banners.banners.filter((b) => b.status === "published").length)}</td></tr>
                    {[...reasons].map(([why, n]) => (
                      <tr key={why}><td>לא פורסם: {why}</td><td className="num">{fmt(n)}</td></tr>
                    ))}
                    {Object.entries(banners.errors).map(([code, n]) => (
                      <tr key={code}><td>שגיאת ספק <span dir="ltr">{code}</span></td><td className="num">{fmt(n)}</td></tr>
                    ))}
                    {(banners.errorDetails ?? []).map((d) => (
                      <tr key={d.code + d.message}><td>הודעת הספק ל־<span dir="ltr">{d.code}</span> (מסוננת)</td><td dir="auto">{d.message ?? "לא הוחזרה הודעה"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="fp-fine">כשאין קמפיין פעיל עם קישור מאומת, דף הבית מציג במקומו שערי קטגוריות.</p>
          </section>
          <p><Link className="fp-link" href="/deals">לקטלוג</Link></p>
        </article>
      </main>
    </PublicShell>
  );
}
