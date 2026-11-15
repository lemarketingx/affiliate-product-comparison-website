import Link from "next/link";
import { ChevronLeft, BadgeCheck, Store } from "lucide-react";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import ProductImage from "./product-image";
import { israelPriceFor } from "../lib/dealpilot/israel-prices";
import { brandBySlug } from "../lib/dealpilot/brands";
import { BrandMark } from "./brand-mark";
import { FavButton } from "./favorites";

export function discountOf(item: Pick<CatalogItem, "price" | "originalPrice">) {
  const p = Number(item.price),
    o = Number(item.originalPrice);
  if (!item.originalPrice || !Number.isFinite(p) || !Number.isFinite(o) || o <= p) return null;
  const pct = Math.round(((o - p) / o) * 100);
  return pct >= 3 ? pct : null;
}

export function StoreLine({ item }: { item: CatalogItem }) {
  if (!item.shopName) return null;
  return (
    <p className={"og-store " + (item.storeStatus === "verified" ? "is-verified" : "")}>
      {item.storeStatus === "verified" ? (
        <BadgeCheck size={14} aria-hidden="true" />
      ) : (
        <Store size={14} aria-hidden="true" />
      )}
      <span dir="ltr">{item.shopName}</span>
      <small>
        {item.storeStatus === "verified" ? "חנות שנבדקה ידנית" : "שם החנות תואם למותג"}
      </small>
    </p>
  );
}

export function BrandChip({ slug, name }: { slug: string; name: string }) {
  const b = brandBySlug(slug);
  return (
    <Link
      href={"/brands/" + slug}
      className="og-chip"
      style={{ "--accent": b?.accent ?? "#0b1730" } as React.CSSProperties}
      dir="ltr"
    >
      <BrandMark slug={slug} name={name} className="og-chip-brand" />
    </Link>
  );
}

export function ProductCard({ item }: { item: CatalogItem }) {
  const il = israelPriceFor(item.id);
  const off = discountOf(item);
  const price = formatMoney(item.price, item.currency);
  return (
    <article className="dp-product og-card">
      <div className="og-card-top">
        <BrandChip slug={item.categorySlug} name={item.category} />
        <FavButton
          fav={{ id: item.id, title: item.title, image: item.image, price, brand: item.category }}
        />
      </div>
      <Link className="og-card-image" href={"/products/" + item.id} tabIndex={-1} aria-hidden="true">
        <ProductImage src={item.image} alt="" />
        {off && (
          <span className="og-off" title="לפי מחיר המקור שדווח על ידי הספק">
            ‎-{off}%
          </span>
        )}
      </Link>
      <div className="og-card-body">
        <h3 dir="auto">
          <Link href={"/products/" + item.id}>{item.title}</Link>
        </h3>
        <StoreLine item={item} />
        {item.orders !== null && <p className="og-card-meta">{item.orders.toLocaleString("he-IL")} הזמנות מדווחות</p>}
      </div>
      <div className="dp-product-price og-card-price">
        <div>
          <strong dir="auto" title="מחיר שהתקבל מממשק AliExpress. המחיר בקופה עשוי להיות שונה.">{price}</strong>
          {off && (
            <s dir="auto" aria-label="מחיר לפני הנחה לפי הספק">
              {formatMoney(item.originalPrice, item.currency)}
            </s>
          )}
          {il && (
            <span className="og-card-il">
              בישראל {formatMoney(String(il.price), "ILS")} · {il.store}
            </span>
          )}
        </div>
        <Link className="og-card-go" href={"/products/" + item.id} aria-label={"פרטי " + item.title}>
          למוצר <ChevronLeft size={16} />
        </Link>
      </div>
      <small className="og-card-aff">מחיר מדווח · המחיר בקופה עשוי להשתנות{item.affiliateUrl ? " · קישור שותפים" : ""}</small>
    </article>
  );
}
