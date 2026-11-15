import type { TaxConfig } from "./import-tax.ts";

export type BasketCostInput = {
  unitPriceILS: number;
  quantity: number;
  discountILS: number;
  otherGoodsILS: number;
  shippingILS: number | null;
  insuranceILS: number | null;
  handlingILS: number | null;
  usdIlsRate: number | null;
};
export type BasketCostResult = {
  status: "invalid" | "incomplete" | "exempt" | "vat_estimate" | "special_tax";
  goodsILS: number | null;
  thresholdUSD: number | null;
  estimatedVAT: number | null;
  estimatedTotalILS: number | null;
  knownSubtotalILS: number | null;
  message: string;
};
const valid = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1_000_000;
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Israeli personal-import calculator. Never labels incomplete or product-specific
 * tax scenarios as a final payable amount. Exemption uses GOODS value, not freight
 * when separate. VAT above exemption includes freight and insurance. Does not
 * auto-assume a product's tariff, excise, courier fees or any coupon.
 */
export function calculateBasketCost(x: BasketCostInput, cfg: TaxConfig): BasketCostResult {
  const incomplete = (msg: string, goodsILS: number | null = null, knownSubtotalILS: number | null = null): BasketCostResult =>
    ({ status: "incomplete", goodsILS, thresholdUSD: null, estimatedVAT: null, estimatedTotalILS: null, knownSubtotalILS, message: msg });
  if (!valid(x.unitPriceILS) || x.unitPriceILS <= 0 || !Number.isSafeInteger(x.quantity) || x.quantity < 1 || x.quantity > 100 ||
      !valid(x.discountILS) || !valid(x.otherGoodsILS) || (x.shippingILS !== null && !valid(x.shippingILS)) ||
      (x.insuranceILS !== null && !valid(x.insuranceILS)) || (x.handlingILS !== null && !valid(x.handlingILS))) {
    return { ...incomplete("הזינו מחיר וכמויות תקינים."), status: "invalid" };
  }
  const gross = x.unitPriceILS * x.quantity;
  if (x.discountILS > gross) return { ...incomplete("ההנחה לא יכולה להיות גבוהה ממחיר המוצרים."), status: "invalid" };
  const goodsILS = round(gross - x.discountILS + x.otherGoodsILS);
  const subtotal = round(goodsILS + (x.shippingILS ?? 0) + (x.insuranceILS ?? 0) + (x.handlingILS ?? 0));
  if (x.shippingILS === null || x.insuranceILS === null || x.handlingILS === null)
    return incomplete("יש להזין משלוח, ביטוח ועמלות טיפול (אפשר להזין 0 אם אין).", goodsILS, subtotal);
  if (!cfg.verified || !cfg.sources.length || cfg.exemptionUsd === null || cfg.vatRate === null || cfg.customsFreeUpToUsd === null ||
      !x.usdIlsRate || !Number.isFinite(x.usdIlsRate) || x.usdIlsRate <= 0)
    return incomplete("חסר שער דולר תקין או כללי מיסוי מאומתים. לא מוצגת עלות סופית.", goodsILS, subtotal);
  const usd = round(goodsILS / x.usdIlsRate);
  if (usd > cfg.customsFreeUpToUsd)
    return { status: "special_tax", goodsILS, thresholdUSD: usd, estimatedVAT: null, estimatedTotalILS: null,
      knownSubtotalILS: subtotal, message: "מעל מדרגת הפטור ממכס. מכס ומס קנייה תלויים בסיווג המוצר, ולכן לא ניתן לתת סך סופי בלי בדיקת רשות המסים." };
  if (usd <= cfg.exemptionUsd)
    return { status: "exempt", goodsILS, thresholdUSD: usd, estimatedVAT: 0, estimatedTotalILS: subtotal,
      knownSubtotalILS: subtotal, message: "בהנחת מוצר רגיל שאינו מוחרג ובתנאי שהחיובים הופרדו, המשלוח מתחת לתקרת הפטור. אם מוצרים נוספים מאותו ספק נשלחים סמוך, יש לחשב אותם יחד." };
  const estimatedVAT = round((goodsILS + x.shippingILS + x.insuranceILS) * cfg.vatRate);
  return { status: "vat_estimate", goodsILS, thresholdUSD: usd, estimatedVAT,
    estimatedTotalILS: round(subtotal + estimatedVAT), knownSubtotalILS: subtotal,
    message: "אומדן מע״מ בלבד. מס קנייה, אגרות ועמלות נוספות עלולים לחול לפי המוצר והמוביל. מע״מ ששולם כבר בקופה לא ישולם שוב." };
}
