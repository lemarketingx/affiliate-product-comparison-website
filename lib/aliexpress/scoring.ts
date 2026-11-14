// Pure, explainable prioritization heuristic. NOT AI, sales predictions, or a purchase recommendation.
// Never treat an unverified promotion URL as proof of a payable affiliate commission.
export type ProductSignal = {
  price: string | null;
  currency: string | null;
  image: string | null;
  productUrl: string | null;
  affiliateUrl: string | null;
  orders: number | null;
  commissionRate: string | null;
};

export type ProductAssessment = {
  score: number;
  status: "review" | "insufficient_data";
  reasons: string[];
  blockers: string[];
};

export function assessProduct(p: ProductSignal): ProductAssessment {
  let score = 0;
  const reasons: string[] = [];
  const blockers: string[] = [];
  const price = p.price === null ? NaN : Number(p.price);
  const hasPrice = Number.isFinite(price) && price > 0 && !!p.currency;
  if (hasPrice) {
    score += 20;
    reasons.push("מחיר ומטבע התקבלו");
  } else blockers.push("חסר מחיר תקין");

  if (p.image) {
    score += 15;
    reasons.push("קיימת תמונת מוצר");
  } else blockers.push("אין תמונת מוצר");

  if (p.productUrl) {
    score += 10;
    reasons.push("קיים קישור מוצר");
  } else blockers.push("חסר קישור מוצר");

  if (p.affiliateUrl) {
    score += 15;
    reasons.push("התקבל קישור קידום");
  } else blockers.push("לא התקבל קישור קידום");

  if (p.orders !== null && Number.isFinite(p.orders) && p.orders >= 0) {
    if (p.orders >= 1000) score += 25;
    else if (p.orders >= 100) score += 18;
    else if (p.orders >= 10) score += 10;
    reasons.push(
      "דווחו " + Math.floor(p.orders).toLocaleString("he-IL") + " הזמנות",
    );
  } else blockers.push("חסר נתון הזמנות");

  // Provider commission_rate can differ by API product. No conversion to payout without validation.
  const rate = p.commissionRate?.trim();
  if (rate && /\d/.test(rate)) {
    score += 15;
    reasons.push("התקבל נתון שיעור עמלה, טרם אומת");
  } else blockers.push("אין נתון עמלה");

  const critical = !hasPrice || !p.image || !p.productUrl || !p.affiliateUrl;
  return {
    score,
    status: critical ? "insufficient_data" : "review",
    reasons,
    blockers,
  };
}
