// Public publication policy. Unknown, stale, percentage-only or country-requested
// data cannot substitute for verified stars, Israeli reviews or delivery evidence.
export const QUALITY_POLICY = {
  minimumOrdersExclusive: 500,
  minimumRating: 4.7,
  destination: "IL",
  maxEvidenceAgeMs: 6 * 60 * 60 * 1000,
} as const;
export type QualityEvidence = {
  rating: {
    value: number;
    scale: 5;
    source: "aliexpress_product_rating_api";
    checkedAt: string;
  } | null;
  israelReviews: {
    country: "IL";
    count: number;
    source: "aliexpress.social.product.evaluation.query";
    checkedAt: string;
  } | null;
  shipping: {
    country: "IL";
    available: boolean;
    source: "aliexpress_delivery_api";
    checkedAt: string;
  } | null;
};
export function unknownQuality(): QualityEvidence {
  return { rating: null, israelReviews: null, shipping: null };
}
export type QualityProduct = {
  orders: number | null;
  title: string;
  price: string | null;
  currency: string | null;
  image: string | null;
  productUrl: string | null;
  affiliateUrl: string | null;
  quality?: QualityEvidence;
};
export const qualityLabels = {
  orders: "נדרשות יותר מ־500 רכישות מדווחות",
  rating: "חסר דירוג כוכבים מאומת של 4.7 ומעלה",
  israel_reviews: "חסרה ביקורת מאומתת מישראל",
  shipping: "חסר אימות משלוח לישראל",
  hebrew: "חסר תרגום לעברית מהספק",
  product_data: "חסרים מחיר, תמונה או קישורים תקינים",
} as const;
function fresh(value: string | undefined, now: number) {
  if (!value) return false;
  const time = Date.parse(value);
  return (
    Number.isFinite(time) &&
    time <= now + 60000 &&
    now - time <= QUALITY_POLICY.maxEvidenceAgeMs
  );
}
export function evaluateEligibility(p: QualityProduct, now = Date.now()) {
  const blockers: (keyof typeof qualityLabels)[] = [];
  if (p.orders === null || !Number.isSafeInteger(p.orders) || p.orders <= 500)
    blockers.push("orders");
  const q = p.quality;
  if (
    !q?.rating ||
    q.rating.source !== "aliexpress_product_rating_api" ||
    q.rating.scale !== 5 ||
    !Number.isFinite(q.rating.value) ||
    q.rating.value < 4.7 ||
    q.rating.value > 5 ||
    !fresh(q.rating.checkedAt, now)
  )
    blockers.push("rating");
  if (
    !q?.israelReviews ||
    q.israelReviews.source !== "aliexpress.social.product.evaluation.query" ||
    q.israelReviews.country !== "IL" ||
    !Number.isSafeInteger(q.israelReviews.count) ||
    q.israelReviews.count < 1 ||
    !fresh(q.israelReviews.checkedAt, now)
  )
    blockers.push("israel_reviews");
  if (
    !q?.shipping ||
    q.shipping.source !== "aliexpress_delivery_api" ||
    q.shipping.country !== "IL" ||
    q.shipping.available !== true ||
    !fresh(q.shipping.checkedAt, now)
  )
    blockers.push("shipping");
  if (!/[\u0590-\u05ff]/.test(p.title)) blockers.push("hebrew");
  if (
    !p.price ||
    !Number.isFinite(Number(p.price)) ||
    Number(p.price) <= 0 ||
    !p.currency ||
    !p.image ||
    !p.productUrl ||
    !p.affiliateUrl
  )
    blockers.push("product_data");
  return {
    eligible: blockers.length === 0,
    blockers,
    reasons: blockers.map((code) => qualityLabels[code]),
  };
}
