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
