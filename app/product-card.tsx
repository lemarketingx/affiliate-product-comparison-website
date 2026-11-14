import Link from "next/link";
import { ArrowUpLeft, ImageOff } from "lucide-react";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import ProductImage from "./product-image";
export function ProductCard({ item }: { item: CatalogItem }) {
  return (
    <article className="dp-product">
      <Link
        className="dp-product-image"
        href={"/products/" + item.id}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage src={item.image} alt="" />
        <span className="dp-image-category">{item.category}</span>
      </Link>
      <div className="dp-product-body">
        <h3 dir="auto">
          <Link href={"/products/" + item.id}>{item.title}</Link>
        </h3>
        <p className="dp-product-orders">
          {item.orders !== null
            ? item.orders.toLocaleString("he-IL") + " הזמנות לפי הספק"
            : "נתוני הזמנות אינם זמינים"}
        </p>
        {item.quality?.rating && (
          <p className="dp-product-orders">
            דירוג {item.quality.rating.value.toFixed(1)}/5 ·{" "}
            {item.quality.israelReviews?.count} ביקורות מישראל
          </p>
        )}
        <div className="dp-product-price">
          <strong dir="auto">{formatMoney(item.price, item.currency)}</strong>
          <Link href={"/products/" + item.id} aria-label={"פרטי " + item.title}>
            <ArrowUpLeft size={21} />
          </Link>
        </div>
        <small>
          {item.affiliateUrl ? "כולל קישור שותפים" : "קישור שותפים אינו זמין"}
        </small>
      </div>
    </article>
  );
}
