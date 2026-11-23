// Ready-to-paste channel post drafts from the cached catalog (pure, unit-tested).
// Nothing is published from here. A pasted post outlives the price window, so
// every price carries its check time and "may have changed", or is left out.
type Item = {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  priceStatus?: "current" | "stale" | "unknown" | null;
  priceObservedAt?: string | null;
  orders: number | null;
};
export type Channel = "telegram" | "facebook" | "instagram";
export type Draft = { id: string; text: string };

const money = (price: string, currency: string) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(Number(price));
const when = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }).format(new Date(iso));

/**
 * Picks `count` products with a current price and reported sales, rotating daily
 * through the best sellers so consecutive days do not repeat the same posts.
 */
export function postDrafts(
  items: readonly Item[],
  opts: { origin: string; channel: Channel; brandOf: (i: Item) => string | null; count?: number; now?: Date },
): Draft[] {
  const now = opts.now ?? new Date();
  const pool = items
    .filter((i) => i.priceStatus === "current" && i.price && i.currency && i.priceObservedAt && (i.orders ?? 0) > 0 && opts.brandOf(i))
    .sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0) || a.id.localeCompare(b.id))
    .slice(0, 60);
  if (!pool.length) return [];
  const count = Math.min(opts.count ?? 5, pool.length);
  const day = Math.floor(now.getTime() / 86_400_000);
  const start = (day * count) % pool.length;
  return Array.from({ length: count }, (_, k) => pool[(start + k) % pool.length]).map((i) => {
    const url = `${opts.origin}/products/${i.id}?utm_source=${opts.channel}&utm_medium=social&utm_campaign=daily_picks`;
    const text = [
      `${opts.brandOf(i)} · ${i.title}`,
      `מחיר שבדקנו ב־AliExpress: ${money(i.price!, i.currency!)} (נבדק ${when(i.priceObservedAt!)}; ייתכן שהשתנה מאז)`,
      `${(i.orders ?? 0).toLocaleString("he-IL")} מכירות מדווחות לפי הספק`,
      `פרטים, היסטוריית מחיר והערכת מס יבוא: ${url}`,
      "קישור שותפים: ייתכן שנקבל עמלה, בלי עלות נוספת לכם. המחיר הסופי והמשלוח נקבעים בקופה.",
    ].join("\n");
    return { id: i.id, text };
  });
}
