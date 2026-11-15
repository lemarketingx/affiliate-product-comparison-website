import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, Store } from "lucide-react";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import ProductImage from "./product-image";
import { evaluateEligibility } from "../lib/aliexpress/quality";
import { israelPriceFor } from "../lib/dealpilot/israel-prices";
import { serial } from "./og-bits";

export function StoreLine({ item }: { item: CatalogItem }) {
  if (!item.shopName) return null;
  return (
    <p className={"og-store " + (item.storeStatus === "verified" ? "is-verified" : "")}>
      {item.storeStatus === "verified" ? (
        <BadgeCheck size={15} aria-hidden="true" />
      ) : (
        <Store size={15} aria-hidden="true" />
      )}
      <span dir="ltr">{item.shopName}</span>
      <small>
        {item.storeStatus === "verified" ? "חנות רשמית מאומתת" : "חנות רשמית לפי שם החנות"}
      </small>
    </p>
  );
}

/* A product is a certificate tag: brand, serial, store, price. */
export function ProductCard({ item }: { item: CatalogItem }) {
  const verified = evaluateEligibility(item).eligible;
  const il = israelPriceFor(item.id);
  return (
    <article className="dp-product og-tag">
      <div className="og-tag-head">
        <span className="og-tag-brand" dir="ltr">
          {item.category}
        </span>
        <span className="og-tag-serial" dir="ltr">
          {serial(item.id)}
        </span>
      </div>
      <Link
        className="og-tag-image"
        href={"/products/" + item.id}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage src={item.image} alt="" />
      </Link>
      <div className="og-tag-body">
        <h3 dir="auto">
          <Link href={"/products/" + item.id}>{item.title}</Link>
        </h3>
        <StoreLine item={item} />
        <p className="og-tag-meta">
          {item.orders !== null
            ? item.orders.toLocaleString("he-IL") + " הזמנות לפי הספק"
            : "נתוני הזמנות אינם זמינים"}
          {" · "}
          <span className={verified ? "og-ok" : "og-pending"}>
            {verified ? "מאומת לפי תנאי הסינון" : "טרם נבדק לפי תנאי הסינון שלך"}
          </span>
        </p>
      </div>
      <div className="dp-product-price og-tag-price">
        <div>
          <small>באליאקספרס</small>
          <strong dir="auto">{formatMoney(item.price, item.currency)}</strong>
          {il && (
            <span className="og-tag-il">
              בישראל {formatMoney(String(il.price), "ILS")} · {il.store}
            </span>
          )}
        </div>
        <Link
          className="og-tag-go"
          href={"/products/" + item.id}
          aria-label={"פרטי " + item.title}
        >
          <ArrowUpLeft size={20} />
        </Link>
      </div>
      <small className="og-tag-aff">
        {item.affiliateUrl ? "כולל קישור שותפים" : "קישור שותפים אינו זמין"}
      </small>
    </article>
  );
}
