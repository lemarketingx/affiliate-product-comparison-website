import type { TaxConfig } from "./import-tax.ts";

export type CostLineState = "known" | "user" | "not_computed";
export type CostLine = { id: string; label: string; amount: number | null; state: CostLineState; note?: string };
export type LandedCostInput = {
  /** AliExpress supplier price in ILS (from the API) or typed by the visitor. */
  itemPriceILS: number | null;
  itemFromApi?: boolean;
  shippingILS: number | null;
  accessories: { label: string; priceILS: number | null }[];
  /** USD→ILS rate typed by the visitor (needed to compare with a USD threshold). */
  usdIlsRate: number | null;
  /** Israeli price: owner-entered (with source) or typed by the visitor. */
  israelPrice: { priceILS: number; origin: "owner" | "visitor"; label: string } | null;
};
export type LandedCostResult = {
  lines: CostLine[];
  /** Sum of computed lines. */
  subtotal: number;
  /** True only when every line was computed. */
  complete: boolean;
  /** Estimated gap vs Israel; null when we cannot honestly compute it. */
  gap: number | null;
  gapReason: string | null;
  missing: string[];
};

const money = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const round = (n: number) => Math.round(n * 100) / 100;

export function landedCost(input: LandedCostInput, tax: TaxConfig): LandedCostResult {
  const lines: CostLine[] = [];
  const missing: string[] = [];
  if (money(input.itemPriceILS) && input.itemPriceILS > 0)
    lines.push({ id: "item", label: "מחיר המוצר באליאקספרס", amount: round(input.itemPriceILS), state: input.itemFromApi ? "known" : "user", note: input.itemFromApi ? "מחיר ספק מה־API. המחיר בקופה עשוי להשתנות." : undefined });
  else {
    lines.push({ id: "item", label: "מחיר המוצר באליאקספרס", amount: null, state: "not_computed", note: "הזינו מחיר." });
    missing.push("מחיר המוצר");
  }
  if (money(input.shippingILS))
    lines.push({ id: "shipping", label: "משלוח לישראל", amount: round(input.shippingILS), state: "user" });
  else {
    lines.push({ id: "shipping", label: "משלוח לישראל", amount: null, state: "not_computed", note: "המשלוח מופיע בעמוד התשלום. הזינו אותו (0 אם חינם)." });
    missing.push("משלוח");
  }
  input.accessories.forEach((a, i) => {
    if (money(a.priceILS))
      lines.push({ id: "acc-" + i, label: a.label, amount: round(a.priceILS), state: "user" });
    else {
      lines.push({ id: "acc-" + i, label: a.label, amount: null, state: "not_computed", note: "אביזר חובה שלא בקופסה. הזינו מחיר, או 0 אם יש לכם." });
      missing.push(a.label);
    }
  });

  // Import tax: only with verified official parameters.
  const parcel = (lines[0].amount ?? NaN) + (lines[1].amount ?? NaN);
  if (!tax.verified || tax.vatExemptionUsd === null || tax.vatRate === null || !tax.officialSource) {
    lines.push({ id: "tax", label: "מע\"מ / מכס ביבוא אישי", amount: null, state: "not_computed", note: tax.unverifiedReason });
    missing.push("מס יבוא (לא אומת)");
  } else if (!Number.isFinite(parcel)) {
    lines.push({ id: "tax", label: "מע\"מ / מכס ביבוא אישי", amount: null, state: "not_computed", note: "נדרשים מחיר ומשלוח כדי לבדוק מול התקרה." });
    missing.push("מס יבוא");
  } else if (!money(input.usdIlsRate) || input.usdIlsRate <= 0) {
    lines.push({ id: "tax", label: "מע\"מ / מכס ביבוא אישי", amount: null, state: "not_computed", note: "התקרה נקבעת בדולרים. הזינו שער דולר עדכני כדי לבדוק." });
    missing.push("שער דולר");
  } else {
    const declared = tax.shippingIncluded === false ? lines[0].amount! : parcel;
    const usd = declared / input.usdIlsRate;
    if (tax.customsThresholdUsd !== null && usd > tax.customsThresholdUsd) {
      lines.push({ id: "tax", label: "מע\"מ / מכס ביבוא אישי", amount: null, state: "not_computed", note: `ערך של כ־${Math.round(usd)}$ עובר את סף המכס. המכס ומס הקנייה תלויים בסוג המוצר, ולכן לא חישבנו.` });
      missing.push("מכס (תלוי מוצר)");
    } else if (usd <= tax.vatExemptionUsd) {
      lines.push({ id: "tax", label: "מע\"מ ביבוא אישי", amount: 0, state: "known", note: `ערך של כ־${Math.round(usd)}$, עד התקרה של ${tax.vatExemptionUsd}$. ייתכן פטור. בדקו אם אליאקספרס גובה מע\"מ כבר בקופה.` });
    } else {
      lines.push({ id: "tax", label: "מע\"מ ביבוא אישי", amount: round(declared * tax.vatRate), state: "known", note: `ערך של כ־${Math.round(usd)}$, מעל התקרה של ${tax.vatExemptionUsd}$. מע\"מ ${Math.round(tax.vatRate * 100)}%. ייתכן שנגבה כבר בקופה, ואז אל תשלמו פעמיים.` });
    }
  }

  const subtotal = round(lines.reduce((s, l) => s + (l.amount ?? 0), 0));
  const complete = lines.every((l) => l.state !== "not_computed");
  let gap: number | null = null;
  let gapReason: string | null = null;
  if (!input.israelPrice || !money(input.israelPrice.priceILS) || input.israelPrice.priceILS <= 0)
    gapReason = "אין מחיר ישראלי עם מקור, ולכן לא מוצג פער.";
  else if (!complete) gapReason = "חסרים רכיבים בעלות הכוללת: " + missing.join(", ") + ". לכן לא מוצג פער.";
  else gap = round(input.israelPrice.priceILS - subtotal);
  return { lines, subtotal, complete, gap, gapReason, missing };
}
