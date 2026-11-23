// schema.org JSON-LD for public pages (pure, unit-tested). Honesty rules apply:
// an Offer only for a price shown as current, in its real currency; never
// availability, ratings, reviews or seller claims we do not have.
type ProductLike = {
  id: string;
  title: string;
  image?: string | null;
  images?: string[] | null;
  price: string | null;
  currency: string | null;
  priceStatus?: "current" | "stale" | "unknown" | null;
  category?: string | null;
};

export function productJsonLd(p: ProductLike, origin: string, brandName: string | null) {
  const url = `${origin}/products/${p.id}`;
  const images = (p.images?.length ? p.images : p.image ? [p.image] : []).filter((s) => /^https:\/\//.test(s)).slice(0, 5);
  const price = p.price !== null && Number.isFinite(Number(p.price)) && Number(p.price) > 0 ? Number(p.price).toFixed(2) : null;
  // A legacy (no-DB) item carries no status; its price is a live provider price.
  const current = p.priceStatus === undefined || p.priceStatus === null || p.priceStatus === "current";
  const offer =
    price && current && /^[A-Z]{3}$/.test(p.currency ?? "")
      ? { "@type": "Offer", url, price, priceCurrency: p.currency }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: p.id,
    url,
    ...(images.length ? { image: images } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(p.category ? { category: p.category } : {}),
    ...(offer ? { offers: offer } : {}),
  };
}

export function breadcrumbJsonLd(origin: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: origin + it.path })),
  };
}

export function itemListJsonLd(origin: string, ids: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ids.slice(0, 30).map((id, i) => ({ "@type": "ListItem", position: i + 1, url: `${origin}/products/${id}` })),
  };
}

/** Serialises JSON-LD for a <script> tag; "<" is escaped so data can never close the tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
