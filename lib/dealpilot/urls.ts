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
export function formatMoney(price: string | null, currency: string | null) {
  if (
    !price ||
    !currency ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  )
    return "מחיר אינו זמין";
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency,
    }).format(Number(price));
  } catch {
    return `${price} ${currency}`;
  }
}
