import Link from "next/link";
import { ArrowUpLeft, ShieldCheck } from "lucide-react";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";

/**
 * Editorial product banners from already-published affiliate catalog entries.
 * These are NOT official AliExpress campaign creatives and advertise no discount.
 * The click uses the same server-validated /go route as catalog products.
 */
export function selectAffiliateBannerProducts(items: CatalogItem[], count = 3): CatalogItem[] {
  const chosen: CatalogItem[] = [];
  const categories = new Set<string>();
  for (const item of items) {
    if (!item.affiliateUrl || !item.image || !item.price || item.currency !== "ILS" || !item.title) continue;
    if (categories.has(item.categorySlug)) continue;
    categories.add(item.categorySlug);
    chosen.push(item);
    if (chosen.length === count) break;
  }
  return chosen;
}

export default function ProductPromoStrip({ items }: { items: CatalogItem[] }) {
  const selected = selectAffiliateBannerProducts(items);
  if (!selected.length) return null;
  return (
    <section className="fp-wrap fp-product-promos" aria-labelledby="product-promos-heading">
      <div className="fp-product-promos-heading">
        <div>
          <span className="fp-kicker">בחירה מתוך הקטלוג</span>
          <h2 id="product-promos-heading">משהו טוב בדרך אליכם.</h2>
          <p>מוצרים עם נתוני מכירות מדווחים וקישור שותפים. הדירוג והמשלוח לישראל טרם אומתו.</p>
        </div>
        <Link className="fp-link" href="/deals">כל המוצרים <ArrowUpLeft size={16} aria-hidden="true" /></Link>
      </div>
      <div className="fp-product-promos-grid">
        {selected.map((item, index) => (
          <a
            key={item.id}
            className={"fp-product-promo fp-product-promo-" + index}
            href={"/go/" + item.id + "?source=product-banner"}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={"צפייה ב־AliExpress: " + item.title}
          >
            <span className="fp-product-promo-content">
              <span className="fp-product-promo-tag">מוצר נבחר · {item.category}</span>
              <strong dir="auto">{item.title}</strong>
              <span className="fp-product-promo-price">מחיר ספק: <b dir="auto">{formatMoney(item.price, item.currency)}</b></span>
              <span className="fp-product-promo-action">למוצר ב־AliExpress <ArrowUpLeft size={18} aria-hidden="true" /></span>
            </span>
            <span className="fp-product-promo-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            </span>
          </a>
        ))}
      </div>
      <p className="fp-fine fp-product-promos-disclosure"><ShieldCheck size={15} aria-hidden="true" /> קישורי שותפים: ייתכן שנקבל עמלה. המחיר הסופי, המשלוח והזמינות נקבעים ב־AliExpress. אין כאן הבטחה להנחה.</p>
    </section>
  );
}
