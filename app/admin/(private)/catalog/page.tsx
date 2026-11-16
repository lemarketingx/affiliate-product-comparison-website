import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { configured } from "../../../../lib/aliexpress/affiliate";
import { dashboard, storeConfigured, type Dashboard } from "../../../../lib/catalog-store/server";
import { PIPELINE_POLICY } from "../../../../lib/catalog-store/pipeline";
import { GAP_LABELS, compareObservations, priceDiagnostics, type GapCode } from "../../../../lib/catalog-store/price-view";
import { REJECT_LABELS, type RejectReason } from "../../../../lib/aliexpress/catalog-build";
import { getUsdRate } from "../../../../lib/dealpilot/fx";
import { RunImportButton, PublishToggle } from "./actions";

export const dynamic = "force-dynamic";
const d = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(iso)) : "—";
const RUN_STATUS: Record<string, string> = { running: "רץ", succeeded: "הצליח", partial: "חלקי", failed: "נכשל" };
const reasonLabel = (r: string) =>
  r === "detail_missing" ? "לא הוחזר בבדיקת מוצר 3 פעמים ברצף" : (REJECT_LABELS[r as RejectReason] ?? r);

export default async function CatalogPage() {
  await requireAdmin();
  const ready = storeConfigured();
  let data: Dashboard | null = null;
  let error: string | null = null;
  if (ready) {
    try {
      data = await dashboard();
    } catch (e) {
      error = e instanceof Error ? e.message : "DB_ERROR";
    }
  }
  const fx = await getUsdRate();
  const t = data?.totals;
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">CATALOG ENGINE</span>
          <h1>קטלוג, ייבוא ומחירים</h1>
          <p className="dp-muted">
            מאגר מוצרים קבוע: ייבוא יומי מתוזמן, בדיקת איכות, מניעת כפילויות, היסטוריית מחירים ובדיקת מחיר לפי מזהה מוצר. קליק אינו רכישה, ואין
            כאן נתוני עמלות מאומתות.
          </p>
        </div>
      </header>

      <section className="dp-panel">
        <h2>מצב חיבורים</h2>
        <ul>
          <li>מסד נתונים ייעודי (DEALPILOT_SUPABASE_URL + SERVICE_ROLE): {ready ? "מוגדר" : "לא מוגדר. האתר ממשיך להציג את הקטלוג החי מהמטמון"}</li>
          <li>AliExpress Affiliate API: {configured() ? "מוגדר" : "לא מוגדר"}</li>
          <li>תזמון: פעם ביום (Vercel Cron, 02:17 UTC) · דורש CRON_SECRET</li>
          {error && <li>שגיאת מסד נתונים: <code dir="ltr">{error}</code></li>}
        </ul>
        <RunImportButton disabled={!ready || !configured()} />
      </section>

      {t && data && (
        <>
          <section className="dp-panel" aria-label="מדדים">
            <h2>מדדים</h2>
            <ul className="dp-stat-list">
              <li>מוצרים במאגר: <strong>{t.all}</strong></li>
              <li>מפורסמים: <strong>{t.published}</strong></li>
              <li>
                חדשים שפורסמו היום: <strong>{t.published_today}</strong> מתוך יעד {PIPELINE_POLICY.dailyNewTarget}
                {t.published_today < PIPELINE_POLICY.dailyNewTarget && " · חוסר מדווח, הכללים לא הוקלו"}
              </li>
              <li>נפסלו: <strong>{t.rejected}</strong> · הוצאו מפרסום: <strong>{t.unpublished}</strong></li>
              <li>מפורסמים ללא מחיר עדכני: <strong>{t.published_without_current_price}</strong> (המחיר שלהם לא מוצג באתר)</li>
              <li>מפורסמים שמחירם נבדק לפי מזהה מוצר: <strong>{t.published_detail_checked}</strong></li>
              <li>קליקים ל־AliExpress ב־30 יום: <strong>{data.clicks_30d.total}</strong> (קליקים בלבד; המרות ועמלות מאומתות טרם חוברו)</li>
            </ul>
          </section>

          <section className="dp-panel">
            <h2>סיבות פסילה</h2>
            {Object.keys(data.reject_reasons).length ? (
              <ul>
                {Object.entries(data.reject_reasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([r, n]) => (
                    <li key={r}>
                      {reasonLabel(r)}: {n}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="dp-muted">אין מוצרים שנפסלו.</p>
            )}
          </section>

          <section className="dp-panel">
            <h2>פערי מחיר: חיפוש מול בדיקת מוצר</h2>
            <p className="dp-muted">
              מוצרים שבהם המחיר מחיפוש מילות מפתח שונה ביותר מ־2% מהמחיר שהוחזר בבדיקה לפי מזהה מוצר, עם השדות הגולמיים שמסבירים את הפער. שער
              בנק ישראל להשוואה: {fx ? fx.rate.toFixed(3) : "לא זמין"}.
            </p>
            {data.price_gaps.length ? (
              <div className="dp-table-wrap">
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th>מוצר</th>
                      <th>חיפוש</th>
                      <th>בדיקת מוצר</th>
                      <th>פער</th>
                      <th>הסבר אפשרי</th>
                      <th>פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.price_gaps.map((g) => {
                      const codes: GapCode[] = [
                        ...new Set([
                          ...compareObservations({ sku_id: g.search_sku, currency: g.search_currency }, { sku_id: g.detail_sku, currency: g.detail_currency }),
                          ...priceDiagnostics(g.detail_fields, fx?.rate ?? null),
                        ]),
                      ];
                      return (
                        <tr key={g.product_id}>
                          <td dir="auto">
                            <code dir="ltr">{g.product_id}</code> {g.title.slice(0, 60)}
                          </td>
                          <td dir="ltr">
                            {g.search_price} {g.search_currency} · sku {g.search_sku ?? "?"} · {d(g.search_at)}
                          </td>
                          <td dir="ltr">
                            {g.detail_price} {g.detail_currency} · sku {g.detail_sku ?? "?"} · {g.price_field} · {d(g.detail_at)}
                          </td>
                          <td>{g.gap_pct}%</td>
                          <td>{codes.length ? codes.map((c) => GAP_LABELS[c]).join(" · ") : "לא זוהה הסבר בשדות שהוחזרו"}</td>
                          <td>
                            <PublishToggle productId={g.product_id} unpublish />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dp-muted">אין עדיין פערים שנמדדו (נדרשות לפחות תצפית חיפוש ותצפית בדיקת מוצר לאותו מוצר).</p>
            )}
          </section>

          <section className="dp-panel">
            <h2>הרצות אחרונות</h2>
            {data.runs.length ? (
              <div className="dp-table-wrap">
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>סוג</th>
                      <th>מקור</th>
                      <th>סטטוס</th>
                      <th>התחלה</th>
                      <th>תוצאה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.kind === "discover" ? "ייבוא" : "בדיקת מחירים"}</td>
                        <td>{r.trigger}</td>
                        <td>{RUN_STATUS[r.status] ?? r.status}</td>
                        <td>{d(r.started_at)}</td>
                        <td dir="ltr">
                          <code>
                            {Object.entries(r.stats)
                              .filter(([, v]) => typeof v === "number" || typeof v === "boolean")
                              .map(([k, v]) => `${k}=${v}`)
                              .join(" ")}
                            {Object.keys(r.error_codes).length ? " · errors " + JSON.stringify(r.error_codes) : ""}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dp-muted">עדיין לא בוצעה הרצה.</p>
            )}
          </section>

          <section className="dp-panel">
            <h2>אזהרות ושגיאות אחרונות</h2>
            {data.events.length ? (
              <ul>
                {data.events.map((e, i) => (
                  <li key={i}>
                    {d(e.at)} · {e.level} · <code dir="ltr">{e.code}</code>
                    {e.term ? ` · ${e.term}` : ""}
                    {e.product_id ? ` · ${e.product_id}` : ""}
                    {e.detail ? <span dir="ltr"> · {e.detail}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dp-muted">אין אזהרות.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
