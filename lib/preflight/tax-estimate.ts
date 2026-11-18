// Per-product personal-import tax estimate (Israel). Pure and conservative:
// every result says what it depends on; no rate → no estimate.
import type { TaxConfig } from "./import-tax.ts";

export type UsdRate = { rate: number; date: string; source: string };
export type TaxStatus = "exempt" | "near" | "vat" | "vat_customs" | "unknown";
export type TaxEstimate = {
  status: TaxStatus;
  usd: number | null;
  /** VAT on the item price alone (shipping not included). */
  vatIls: number | null;
  label: string;
  detail: string;
};

/** Within this share below the threshold we warn: variants, quantity and price changes can cross it. */
export const NEAR_SHARE = 0.1;

export function estimateImportTax(priceIls: number | null, rate: UsdRate | null, cfg: TaxConfig): TaxEstimate {
  const unknown = (detail: string): TaxEstimate => ({ status: "unknown", usd: null, vatIls: null, label: "מיסוי: לא חושב", detail });
  if (!cfg.verified || cfg.exemptionUsd === null || cfg.vatRate === null) return unknown("כללי המיסוי לא אומתו ממקור רשמי.");
  if (priceIls === null || !Number.isFinite(priceIls) || priceIls <= 0) return unknown("אין מחיר תקין לחישוב.");
  if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) return unknown("שער הדולר היציג אינו זמין כרגע.");
  const usd = Math.round((priceIls / rate.rate) * 100) / 100;
  const t = cfg.exemptionUsd;
  const vatPct = Math.round(cfg.vatRate * 100);
  if (usd <= t * (1 - NEAR_SHARE))
    return { status: "exempt", usd, vatIls: 0, label: `פטור ממסים (עד ${t}$)`, detail: `כ־${usd.toFixed(0)}$ לפי השער היציג. ביבוא אישי עד ${t}$ אין מע"מ, מכס ומס קנייה, כל עוד ההזמנה כולה מתחת לתקרה.` };
  if (usd <= t)
    return { status: "near", usd, vatIls: 0, label: `קרוב לתקרת הפטור (${t}$)`, detail: `כ־${usd.toFixed(0)}$. כרגע מתחת לתקרה, אבל גרסה יקרה יותר, כמות גדולה יותר או פריט נוסף מאותו מוכר יעבירו את ההזמנה לחיוב במע"מ.` };
  const vatIls = Math.round(priceIls * cfg.vatRate);
  if (cfg.customsFreeUpToUsd !== null && usd > cfg.customsFreeUpToUsd)
    return { status: "vat_customs", usd, vatIls, label: `מע"מ ${vatPct}% וייתכן מכס`, detail: `כ־${usd.toFixed(0)}$, מעל ${cfg.customsFreeUpToUsd}$: מע"מ ${vatPct}% (לפחות כ־₪${vatIls}, לפני משלוח), ובנוסף ייתכנו מכס ומס קנייה לפי סוג המוצר.` };
  return { status: "vat", usd, vatIls, label: `צפוי מע"מ ${vatPct}% · כ־${vatIls} ₪`, detail: `כ־${usd.toFixed(0)}$, מעל תקרת הפטור (${t}$). יחול מע"מ ${vatPct}% על המוצר והמשלוח (כ־₪${vatIls} על המוצר בלבד). במוצרים מסוימים ייתכן גם מס קנייה.` };
}

export type IsraelTotal = {
  /** Estimated cost in ILS before shipping; null when it cannot be computed honestly. */
  totalIls: number | null;
  /** True when more can be added (VAT on shipping, customs or purchase tax). */
  atLeast: boolean;
  label: string;
  note: string;
};

/**
 * "The bottom line" for one item: supplier price plus the import VAT that
 * applies to the item itself. Shipping is not returned by the provider, so the
 * total is always "before shipping"; above the exemption VAT also applies to
 * shipping, so the figure is a lower bound there.
 */
export function estimateIsraelTotal(priceIls: number | null, rate: UsdRate | null, cfg: TaxConfig): IsraelTotal {
  const est = estimateImportTax(priceIls, rate, cfg);
  if (est.status === "unknown" || priceIls === null) return { totalIls: null, atLeast: false, label: "עלות לישראל: לא חושבה", note: est.detail };
  const fmt = (n: number) => "₪" + n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
  if (est.status === "exempt" || est.status === "near") {
    const total = Math.round(priceIls);
    return {
      totalIls: total,
      atLeast: false,
      label: `${fmt(total)} לפני משלוח · ללא מסים צפויים`,
      note: est.status === "near" ? est.detail : `מתחת לתקרת הפטור (${cfg.exemptionUsd}$): לא צפויים מע"מ ומכס, כל עוד ההזמנה כולה מתחת לתקרה.`,
    };
  }
  const total = Math.round(priceIls + (est.vatIls ?? 0));
  return {
    totalIls: total,
    atLeast: true,
    label: `לפחות ${fmt(total)} לפני משלוח · כולל מע"מ`,
    note: est.status === "vat_customs" ? est.detail : `מחיר + מע"מ ${Math.round((cfg.vatRate ?? 0) * 100)}% על המוצר. מע"מ חל גם על המשלוח, ובמוצרים מסוימים ייתכן מס קנייה.`,
  };
}
