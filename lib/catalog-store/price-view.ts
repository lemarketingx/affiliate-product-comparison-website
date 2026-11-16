// Pure price policy and price-gap diagnostics (unit-tested).
import type { PriceFields } from "../aliexpress/normalize.ts";

/** A stored price older than this is not shown as a current price. */
export const PRICE_MAX_AGE_HOURS = 48;

export type PriceStatus = "current" | "stale" | "unknown";

export function priceStatus(observedAt: string | null, now: Date = new Date(), maxAgeHours: number = PRICE_MAX_AGE_HOURS): PriceStatus {
  if (!observedAt) return "unknown";
  const t = Date.parse(observedAt);
  if (!Number.isFinite(t)) return "unknown";
  return now.getTime() - t <= maxAgeHours * 3600_000 ? "current" : "stale";
}

/** What the storefront may display: a stale or unknown price is withheld (null). */
export function displayPrice(
  row: { price: string | number | null; currency: string | null; price_observed_at: string | null },
  now: Date = new Date(),
  maxAgeHours: number = PRICE_MAX_AGE_HOURS,
): { price: string | null; currency: string | null; status: PriceStatus; observedAt: string | null } {
  const status = priceStatus(row.price_observed_at, now, maxAgeHours);
  const value = row.price === null || row.price === undefined ? null : String(row.price);
  const valid = value !== null && Number.isFinite(Number(value)) && Number(value) > 0 && /^[A-Z]{3}$/.test(row.currency ?? "");
  if (status !== "current" || !valid) return { price: null, currency: null, status: valid ? status : "unknown", observedAt: row.price_observed_at };
  return { price: value, currency: row.currency, status, observedAt: row.price_observed_at };
}

export type GapCode = "app_price_differs" | "implied_fx_off" | "not_ils" | "sku_changed" | "currency_changed" | "provider_discount";
export const GAP_LABELS: Record<GapCode, string> = {
  app_price_differs: "מחיר האפליקציה שונה ממחיר האתר (target_app_sale_price ≠ target_sale_price)",
  implied_fx_off: "שער ההמרה הגלום של AliExpress רחוק משער בנק ישראל ביותר מ־5%",
  not_ils: "המחיר לא הוחזר בשקלים",
  sku_changed: "הווריאציה (sku_id) שונה בין החיפוש לבדיקת המוצר",
  currency_changed: "המטבע שונה בין החיפוש לבדיקת המוצר",
  provider_discount: "המחיר הוא מחיר מבצע של הספק (sale < original)",
};

const num = (v: string | null | undefined) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Explains why a displayed price may differ from what a shopper sees, using
 * only fields the provider returned. `usdIls` is the Bank of Israel rate.
 */
export function priceDiagnostics(f: Partial<PriceFields>, usdIls: number | null = null): GapCode[] {
  const out: GapCode[] = [];
  const web = num(f.targetSalePrice), app = num(f.targetAppSalePrice);
  if (web && app && Math.abs(app - web) / web > 0.01) out.push("app_price_differs");
  if (f.targetSalePriceCurrency && f.targetSalePriceCurrency !== "ILS") out.push("not_ils");
  const usd = num(f.salePrice);
  if (usdIls && web && usd && f.salePriceCurrency === "USD" && f.targetSalePriceCurrency === "ILS") {
    const implied = web / usd;
    if (Math.abs(implied - usdIls) / usdIls > 0.05) out.push("implied_fx_off");
  }
  const orig = num(f.targetOriginalPrice);
  if (web && orig && orig > web * 1.01) out.push("provider_discount");
  return out;
}

/** Diagnostics that need two observations (search vs detail of the same product). */
export function compareObservations(
  search: { sku_id: string | null; currency: string | null },
  detail: { sku_id: string | null; currency: string | null },
): GapCode[] {
  const out: GapCode[] = [];
  if (search.sku_id && detail.sku_id && search.sku_id !== detail.sku_id) out.push("sku_changed");
  if (search.currency !== detail.currency) out.push("currency_changed");
  return out;
}
