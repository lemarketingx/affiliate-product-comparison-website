import "server-only";
// Disabled deliberately: no click database and no visitor identifiers.
export function trackingConfigured() {
  return false;
}
export type ClickSource =
  | "catalog"
  | "telegram"
  | "facebook"
  | "instagram"
  | "other";
export function safeSource(value: string | null): ClickSource {
  return value === "catalog" ||
    value === "telegram" ||
    value === "facebook" ||
    value === "instagram"
    ? value
    : "other";
}
export async function recordClick(
  _product: {
    id: string;
    title: string;
    category: string;
    affiliateUrl: string;
  },
  _source: ClickSource,
) {
  return false;
}
export async function clickSummary() {
  return { ready: false, total: null, bySource: [] };
}
