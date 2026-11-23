// Pure helper for the product page comparison table (no React).
type Row = { id: string; categorySlug: string; currency: string | null; price: string | null; orders: number | null };

/** Pure: same-brand, same-category models to compare with the current product.
 * Current product first; the rest by provider price (ILS only, lowest first), then
 * items without a comparable price. Returns [] when there is nothing to compare. */
export function brandCompareRows<T extends Row>(current: T, items: readonly T[], brandOf: (p: T) => string | null, max = 6): T[] {
  const slug = brandOf(current);
  if (!slug) return [];
  const peers = items.filter((x) => x.id !== current.id && x.categorySlug === current.categorySlug && brandOf(x) === slug);
  if (!peers.length) return [];
  const ils = (p: T) => (p.currency === "ILS" && p.price && Number(p.price) > 0 ? Number(p.price) : null);
  peers.sort((a, b) => {
    const pa = ils(a), pb = ils(b);
    if (pa === null && pb === null) return (b.orders ?? 0) - (a.orders ?? 0);
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  });
  return [current, ...peers.slice(0, max - 1)];
}

