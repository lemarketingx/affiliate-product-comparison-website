import Link from "next/link";
import { ArrowRight, ArrowLeft, PackageSearch, RadioTower, Search, ArrowUpLeft } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { categories } from "../lib/dealpilot/categories";
import { CATALOG_POLICY } from "../lib/aliexpress/catalog-build";
import { filterCatalog, pageWindow, SORTS, viewHref, type ViewParams } from "../lib/aliexpress/catalog-view";
import { ProductCard } from "./product-card";
import SortSelect from "./sort-select";
import { IMPORT_TAX } from "../lib/preflight/import-tax";
import { estimateImportTax, type UsdRate } from "../lib/preflight/tax-estimate";

const fmt = (n: number) => n.toLocaleString("he-IL");

/**
 * Server-rendered catalog with real counts, search, category filter, sort and
 * pagination (24 per page). Works without JavaScript; only 24 cards are sent.
 */
export default function CatalogBrowser({
  snapshot,
  params,
  base,
  lockedCategory,
  title,
  usdRate = null,
}: {
  snapshot: CatalogSnapshot;
  params: ViewParams;
  base: string;
  lockedCategory?: string;
  title?: string;
  usdRate?: UsdRate | null;
}) {
  const exemptOnly = params.tax === "exempt" && usdRate !== null;
  const pool = exemptOnly
    ? snapshot.items.filter((p) => estimateImportTax(p.currency === "ILS" ? Number(p.price) : null, usdRate, IMPORT_TAX).status === "exempt")
    : snapshot.items;
  const view = filterCatalog(pool, { ...params, cat: lockedCategory ?? params.cat });
  const published = snapshot.items.length;
  const report = snapshot.report;
  const href = (p: Partial<ViewParams>) => viewHref(base, { ...params, ...p }, Boolean(lockedCategory));
  const activeCat = lockedCategory ?? params.cat;
  const filtered = Boolean(params.q || activeCat || exemptOnly);
  return (
    <section className="fp-section fp-wrap fp-catalog" id="products">
      <div className="fp-section-head">
        <div>
          <span className="fp-kicker">קטלוג מותגים מוכרים</span>
          <h1 className="fp-catalog-title">{title ?? "מצאו את המותג שאתם מחפשים."}</h1>
          <p>
            {snapshot.available
              ? "מוצרי מותגים נבחרים מ־AliExpress, במחירי ספק בשקלים. מקוריות ומוכר מורשה טרם אומתו."
              : "הקטלוג אינו זמין כרגע. נסו שוב מאוחר יותר."}
          </p>
        </div>
      </div>
      <div className="dp-selection-policy fp-notice">
        <RadioTower size={18} aria-hidden="true" />
        <div>
          <strong>רק מותגים מזוהים · מקוריות המוצר טרם אומתה</strong>
          <p>
            המוצרים עברו זיהוי מותג בהצלבת שם המוצר ונתוני חנות/ספק, עם יותר מ־{fmt(CATALOG_POLICY.minimumReportedSalesExclusive)} מכירות מדווחות, מחיר בשקלים, כותרת בעברית וקישור
            שותפים תקין. דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו.
          </p>
          <small>מכירות מדווחות הן נתון של הספק לתקופה אחרונה, לא בדיקת איכות. בדקו דירוג, ביקורות ומשלוח ב־AliExpress לפני רכישה.</small>
        </div>
      </div>

      <p className="fp-tax-note">
        {usdRate ? (
          <>
            מיסוי ביבוא אישי: עד {IMPORT_TAX.exemptionUsd}$ פטור, מעל זה מע&quot;מ {Math.round((IMPORT_TAX.vatRate ?? 0) * 100)}%. לכל מוצר מסומן אם הוא צפוי
            להיות פטור, לפי השער היציג ({usdRate.rate} ₪, {new Date(usdRate.date).toLocaleDateString("he-IL")}). כמה פריטים מאותו מוכר נספרים יחד.{" "}
            <a href={IMPORT_TAX.sources[0].url} target="_blank" rel="noopener noreferrer">מקור: רשות המסים</a>
          </>
        ) : (
          <>שער הדולר אינו זמין כרגע, ולכן סימון המיסוי לכל מוצר לא חושב.</>
        )}
      </p>
      <form className="fp-filters" action={base} method="get" role="search" aria-label="סינון הקטלוג">
        {!lockedCategory && (
          <nav className="fp-tabs" aria-label="קטגוריות">
            <Link href={viewHref(base, { q: params.q, sort: params.sort, tax: params.tax })} aria-current={!activeCat ? "page" : undefined}>
              הכול
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} href={viewHref(base, { q: params.q, sort: params.sort, cat: c.slug, tax: params.tax })} aria-current={activeCat === c.slug ? "page" : undefined}>
                {c.label}
              </Link>
            ))}
          </nav>
        )}
        {params.cat && !lockedCategory && <input type="hidden" name="cat" value={params.cat} />}
        <div className="fp-filter-inputs">
          <label className="fp-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={params.q} maxLength={80} placeholder="חיפוש בקטלוג" aria-label="סינון לפי שם מוצר" />
          </label>
          <SortSelect name="sort" value={params.sort} options={SORTS} />
          {usdRate && (
            <label className="fp-tax-toggle">
              <input type="checkbox" name="tax" value="exempt" defaultChecked={params.tax === "exempt"} />
              רק מוצרים פטורים ממסים (עד {IMPORT_TAX.exemptionUsd}$)
            </label>
          )}
          <button className="fp-btn fp-btn-sm" type="submit">סינון</button>
        </div>
      </form>

      <p className="fp-status-line" role="status">
        {snapshot.warming ? (
          "הקטלוג מתעדכן ברקע"
        ) : snapshot.available ? (
          <>
            <strong>{fmt(view.total)}</strong> {filtered ? "מוצרים עברו את הסינון" : "מוצרים בקטלוג"}
            {filtered && <> מתוך {fmt(published)} שפורסמו</>}
            {view.total > 0 && (
              <> · מוצגים {fmt(view.start + 1)}–{fmt(view.start + view.items.length)} · עמוד {fmt(view.page)} מתוך {fmt(view.pages)}</>
            )}
            {snapshot.fetchedAt &&
              " · נתוני ספק מ־" +
                new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(snapshot.fetchedAt))}
          </>
        ) : (
          "ממתינים לחיבור הקטלוג"
        )}
      </p>
      {snapshot.warming ? (
        <div className="fp-empty" role="status">
          <span><PackageSearch size={34} /></span>
          <h3>הקטלוג מתעדכן ממש עכשיו</h3>
          <p>אנחנו שולפים את המוצרים מ־AliExpress ברקע. רעננו את הדף בעוד כחצי דקה.</p>
        </div>
      ) : view.items.length ? (
        <div className="fp-grid">
          {view.items.map((item, i) => (
            <ProductCard item={item} key={item.id} eager={i < 4} usdRate={usdRate} />
          ))}
        </div>
      ) : (
        <div className="fp-empty">
          <span><PackageSearch size={34} /></span>
          <h3>{snapshot.available ? "לא נמצאו מוצרים בסינון הזה" : "קצת סבלנות, הגילוי בדרך."}</h3>
          <p>
            {snapshot.available
              ? "נסו שם אחר או בחרו קטגוריה נוספת."
              : "אין כרגע נתוני מוצרים להצגה. בינתיים אפשר לעיין במדריך הקנייה."}
          </p>
          {!snapshot.available && (
            <Link className="fp-link" href="/guides">איך קונים חכם <ArrowUpLeft size={17} /></Link>
          )}
        </div>
      )}

      {view.pages > 1 && (
        <nav className="fp-pager" aria-label="עמודי קטלוג">
          {view.page > 1 ? (
            <Link className="fp-pager-step" href={href({ page: view.page - 1 })} rel="prev">
              <ArrowRight size={16} aria-hidden="true" /> הקודם
            </Link>
          ) : <span className="fp-pager-step is-off" aria-hidden="true"><ArrowRight size={16} /> הקודם</span>}
          <ol>
            {pageWindow(view.page, view.pages).map((n, i) =>
              n === "gap" ? (
                <li key={"g" + i} aria-hidden="true">…</li>
              ) : (
                <li key={n}>
                  <Link href={href({ page: n })} aria-current={n === view.page ? "page" : undefined} aria-label={"עמוד " + n}>
                    {n}
                  </Link>
                </li>
              ),
            )}
          </ol>
          {view.page < view.pages ? (
            <Link className="fp-pager-step" href={href({ page: view.page + 1 })} rel="next">
              הבא <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          ) : <span className="fp-pager-step is-off" aria-hidden="true">הבא <ArrowLeft size={16} /></span>}
        </nav>
      )}
      <p className="fp-fine">
        קישורי שותפים עשויים לזכות אותנו בעמלה. איננו מוכרים את המוצרים; המחיר הסופי, תנאי המשלוח והזמינות נקבעים
        ב־AliExpress. <Link href="/disclosure">לגילוי המלא</Link> · <Link href="/catalog-status">איך נבנה הקטלוג</Link>
      </p>
    </section>
  );
}
