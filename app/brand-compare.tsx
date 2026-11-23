import Link from "next/link";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import { brandCompareRows } from "../lib/dealpilot/brand-compare";
export { brandCompareRows };
import { freshnessLabel, priceAgeHours, PRICE_WARN_AGE_HOURS } from "../lib/catalog-store/price-view";
import { productDisplayTitle } from "../lib/dealpilot/product-titles";

/** Comparison table: provider price with its check time, and reported sales.
 * No ranking, no "best" label: the table only lays out facts side by side. */
export function BrandCompare({ rows, currentId, brandName, brandSlug }: { rows: CatalogItem[]; currentId: string; brandName: string; brandSlug: string }) {
  if (rows.length < 2) return null;
  return (
    <section className="bl-section sr-compare" aria-labelledby="sr-compare-title">
      <div className="sr-compare-head">
        <div>
          <h2 id="sr-compare-title">דגמים של <span dir="ltr">{brandName}</span> באותה קטגוריה</h2>
          <p className="bl-fine">מחיר מדווח מהספק עם זמן הבדיקה, ומכירות מדווחות. זו השוואת נתונים, לא דירוג או המלצה.</p>
        </div>
        <Link className="bl-more" href={"/brands/" + brandSlug}>לעמוד המותג <span dir="ltr">{brandName}</span></Link>
      </div>
      <div className="sr-compare-scroll" role="region" aria-label="טבלת השוואה, ניתן לגלול" tabIndex={0}>
        <table className="sr-compare-table">
          <thead>
            <tr><th scope="col">דגם</th><th scope="col">מחיר מדווח</th><th scope="col">מכירות מדווחות</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isCurrent = p.id === currentId;
              const fresh = freshnessLabel(p.priceObservedAt);
              const old = (priceAgeHours(p.priceObservedAt) ?? 0) > PRICE_WARN_AGE_HOURS;
              return (
                <tr key={p.id} className={isCurrent ? "is-current" : undefined} aria-current={isCurrent ? "page" : undefined}>
                  <th scope="row">
                    {isCurrent ? <span className="sr-compare-this">המוצר הזה</span> : null}
                    {isCurrent ? <span className="sr-compare-name" dir="auto">{productDisplayTitle(p.title, brandName)}</span>
                      : <Link className="sr-compare-name" href={"/products/" + p.id} dir="auto">{productDisplayTitle(p.title, brandName)}</Link>}
                  </th>
                  <td data-label="מחיר מדווח">
                    {p.price ? <strong dir="ltr">{formatMoney(p.price, p.currency)}</strong> : <span className="bl-muted">אין מחיר עדכני</span>}
                    {p.price && <small className={fresh ? (old ? "is-old" : undefined) : "is-unknown"}>{fresh ?? "זמן הבדיקה אינו ידוע"}{old ? " · ייתכן שהשתנה" : ""}</small>}
                  </td>
                  <td data-label="מכירות מדווחות">{p.orders !== null ? p.orders.toLocaleString("he-IL") : <span className="bl-muted">לא זמין</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="bl-fine">המחיר הסופי, הגרסה והמשלוח נקבעים בקופה של AliExpress.</p>
    </section>
  );
}
