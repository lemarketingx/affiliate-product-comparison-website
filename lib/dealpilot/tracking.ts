import "server-only";
import { recordStoredClick, storeConfigured } from "../catalog-store/server";
// Click events go to the dedicated DealPilot database when it is configured.
// No IP, cookie, user agent or fingerprint is stored. A click is not a sale.
export function trackingConfigured() {
  return storeConfigured();
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
  product: {
    id: string;
    title: string;
    category: string;
    affiliateUrl: string;
  },
  source: ClickSource,
  page: string | null = null,
) {
  return recordStoredClick(product.id, source, page);
}
export async function clickSummary() {
  return { ready: false, total: null, bySource: [] };
}
