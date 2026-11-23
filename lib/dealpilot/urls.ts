export function safeAliUrl(raw: unknown, image = false): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    const domains = image
      ? ["alicdn.com", "aliexpress-media.com", "aliexpress.com"]
      : ["aliexpress.com", "aliexpress.us"];
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (
      !domains.some(
        (domain) =>
          url.hostname === domain || url.hostname.endsWith("." + domain),
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
// Explicit prefix instead of Intl's he-IL currency style, which inserts
// bidi marks and renders the shekel symbol after the number in RTL layouts.
const shekelNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});
export function formatShekels(amount: number): string {
  return Number.isFinite(amount)
    ? "₪\u00a0" + shekelNumber.format(amount)
    : "מחיר אינו זמין";
}
export function formatMoney(price: string | number | null, currency: string | null): string {
  if (
    price === null ||
    price === "" ||
    !currency ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  ) return "מחיר אינו זמין";
  const n = Number(price);
  if (currency === "ILS") return formatShekels(n);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return shekelNumber.format(n) + " " + currency;
  }
}
