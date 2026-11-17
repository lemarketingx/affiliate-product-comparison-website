import Link from "next/link";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import ProductImage from "./product-image";
import { evaluateEligibility } from "../lib/aliexpress/quality";
import { TaxBadge } from "./tax-badge";
import { identifyListedBrand } from "../lib/dealpilot/brands";
import { freshnessLabel, priceAgeHours, PRICE_WARN_AGE_HOURS } from "../lib/catalog-store/price-view";
import type { UsdRate } from "../lib/preflight/tax-estimate";

/* "השורה התחתונה" card: brand, title, the price as a receipt line, and when
   that price was last checked. The whole card links to the product page. */
export function ProductCard({ item, eager = false, usdRate = null }: { item: CatalogItem; eager?: boolean; usdRate?: UsdRate | null }) {
  const verified = evaluateEligibility(item).eligible;
  const brand = identifyListedBrand(item);
  const fresh = freshnessLabel(item.priceObservedAt);
  return (
    <article className="dp-product bl-card">
      <div className="bl-card-media" aria-hidden="true">
        <ProductImage src={item.image} alt="" thumb lazy={!eager} label={brand?.name ?? null} />
      </div>
      <div className="bl-card-body">
        <div className="bl-card-top">
          {brand ? (
            <Link className="bl-card-brand" href={"/brands/" + brand.slug} dir="ltr" aria-label={"לכל מוצרי המותג " + brand.name}>
              {brand.name}
            </Link>
          ) : (
            <span />
          )}
          <span className="bl-card-cat">{item.category}</span>
        </div>
        <h3 dir="auto">
          <Link href={"/products/" + item.id} aria-label={"פרטי " + item.title}>
            {item.title}
          </Link>
        </h3>
        <div className="dp-product-price">
          <span>מחיר מדווח מ־AliExpress</span>
          {item.price ? (
            <strong dir="ltr">{formatMoney(item.price, item.currency)}</strong>
          ) : (
            <strong className="is-none">אין מחיר עדכני</strong>
          )}
        </div>
        <p className="bl-card-orders">
          {item.orders !== null ? item.orders.toLocaleString("he-IL") + " מכירות מדווחות לפי הספק" : "נתוני מכירות אינם זמינים"}
        </p>
        {verified && item.quality?.rating && (
          <p className="bl-card-orders">
            דירוג {item.quality.rating.value.toFixed(1)}/5 · {item.quality.israelReviews?.count} ביקורות מישראל
          </p>
        )}
        {item.priceStatus !== undefined && (
          <small className={"bl-card-fresh" + (fresh && item.price ? "" : " is-unknown") + ((priceAgeHours(item.priceObservedAt) ?? 0) > PRICE_WARN_AGE_HOURS ? " is-old" : "")}>
            {item.price
              ? (fresh ?? "זמן הבדיקה אינו ידוע") + ((priceAgeHours(item.priceObservedAt) ?? 0) > PRICE_WARN_AGE_HOURS ? " · ייתכן שהשתנה" : "") + " · סופי בקופה"
              : "המחיר האחרון לא עדכני ולכן אינו מוצג"}
          </small>
        )}
        <TaxBadge price={item.currency === "ILS" ? item.price : null} usdRate={usdRate} />
        <div className="bl-card-foot">
          <span className={"bl-chip " + (verified ? "is-go" : "is-wait")}>{verified ? "בדיקות איכות עברו" : "איכות ומקוריות טרם אומתו"}</span>
          <span>{item.affiliateUrl ? "כולל קישור שותפים" : "קישור שותפים אינו זמין"}</span>
        </div>
      </div>
    </article>
  );
}
