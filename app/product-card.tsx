import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import ProductImage from "./product-image";
import { evaluateEligibility } from "../lib/aliexpress/quality";
import { Barcode, flightCode } from "./flight-bits";
import { TaxBadge } from "./tax-badge";
import { identifyListedBrand } from "../lib/dealpilot/brands";
import type { UsdRate } from "../lib/preflight/tax-estimate";

/* A product is a boarding pass: image, ticket body, perforation, price stub. */
export function ProductCard({ item, eager = false, usdRate = null }: { item: CatalogItem; eager?: boolean; usdRate?: UsdRate | null }) {
  const verified = evaluateEligibility(item).eligible;
  const brand = identifyListedBrand(item);
  return (
    <article className="dp-product fp-pass">
      <Link
        className="fp-pass-image"
        href={"/products/" + item.id}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage src={item.image} alt="" thumb lazy={!eager} />
        <span className="fp-pass-class">{item.category}</span>
      </Link>
      <div className="fp-pass-body">
        {brand && <Link className="fp-product-brand-tag" href={"/brands/" + brand.slug} dir="ltr">{brand.name}</Link>}
        <div className="fp-pass-meta">
          <span dir="ltr">{flightCode(item.id)}</span>
          <span className={"fp-chip " + (verified ? "is-go" : "is-wait")}>
            {verified ? "בדיקות איכות עברו" : "איכות ומקוריות טרם אומתו"}
          </span>
        </div>
        <h3 dir="auto">
          <Link href={"/products/" + item.id}>{item.title}</Link>
        </h3>
        <p className="fp-pass-orders">
          {item.orders !== null
            ? item.orders.toLocaleString("he-IL") + " הזמנות לפי הספק"
            : "נתוני הזמנות אינם זמינים"}
        </p>
        {verified && item.quality?.rating && (
          <p className="fp-pass-orders">
            דירוג {item.quality.rating.value.toFixed(1)}/5 ·{" "}
            {item.quality.israelReviews?.count} ביקורות מישראל
          </p>
        )}
      </div>
      <div className="fp-perf" aria-hidden="true" />
      <div className="dp-product-price fp-pass-stub">
        <div>
          <small>מחיר ספק</small>
          <strong dir="auto">{formatMoney(item.price, item.currency)}</strong>
        </div>
        <Barcode seed={item.id} />
        <Link
          className="fp-pass-go"
          href={"/products/" + item.id}
          aria-label={"פרטי " + item.title}
        >
          <ArrowUpLeft size={20} />
        </Link>
      </div>
      <TaxBadge price={item.currency === "ILS" ? item.price : null} usdRate={usdRate} />
      <small className="fp-pass-aff">
        {item.affiliateUrl ? "כולל קישור שותפים" : "קישור שותפים אינו זמין"}
      </small>
    </article>
  );
}
