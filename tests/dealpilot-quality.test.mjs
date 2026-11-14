import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEligibility,
  unknownQuality,
} from "../lib/aliexpress/quality.ts";
const now = Date.parse("2026-11-14T12:00:00Z"),
  checkedAt = new Date(now).toISOString();
const verified = {
  orders: 501,
  title: "מארגן כבלים",
  price: "9.9",
  currency: "USD",
  image: "https://ae01.alicdn.com/a.jpg",
  productUrl: "https://aliexpress.com/item/12345.html",
  affiliateUrl: "https://s.click.aliexpress.com/e/test",
  quality: {
    rating: {
      value: 4.7,
      scale: 5,
      source: "aliexpress_product_rating_api",
      checkedAt,
    },
    israelReviews: {
      country: "IL",
      count: 1,
      source: "aliexpress.social.product.evaluation.query",
      checkedAt,
    },
    shipping: {
      country: "IL",
      available: true,
      source: "aliexpress_delivery_api",
      checkedAt,
    },
  },
};
test("only a complete verified record satisfies all public requirements", () =>
  assert.equal(evaluateEligibility(verified, now).eligible, true));
test("strictly more than 500 purchases: 500 and unknown counts fail", () => {
  for (const orders of [500, 499, 0, null, NaN, Infinity, 501.1])
    assert.ok(
      evaluateEligibility({ ...verified, orders }, now).blockers.includes(
        "orders",
      ),
    );
});
test("4.7 is inclusive, 4.69 or an invalid scale is rejected", () => {
  for (const rating of [
    { ...verified.quality.rating, value: 4.69 },
    { ...verified.quality.rating, value: 98 },
    { ...verified.quality.rating, scale: 100 },
  ])
    assert.ok(
      evaluateEligibility(
        { ...verified, quality: { ...verified.quality, rating } },
        now,
      ).blockers.includes("rating"),
    );
});
test("a positive-feedback percentage never becomes a star rating", () => {
  const result = evaluateEligibility(
    {
      ...verified,
      positiveFeedbackPercent: 100,
      quality: { ...verified.quality, rating: null },
    },
    now,
  );
  assert.ok(result.blockers.includes("rating"));
});
test("requested Israel country alone is not delivery or Israeli-review evidence", () => {
  const result = evaluateEligibility(
    { ...verified, requestedCountry: "IL", quality: unknownQuality() },
    now,
  );
  for (const key of ["rating", "israel_reviews", "shipping"])
    assert.ok(result.blockers.includes(key));
});
test("foreign reviews and unavailable shipping do not pass", () => {
  const result = evaluateEligibility(
    {
      ...verified,
      quality: {
        ...verified.quality,
        israelReviews: { ...verified.quality.israelReviews, country: "US" },
        shipping: { ...verified.quality.shipping, available: false },
      },
    },
    now,
  );
  assert.ok(result.blockers.includes("israel_reviews"));
  assert.ok(result.blockers.includes("shipping"));
});
test("stale or future evidence is rejected", () => {
  for (const checkedAt of [
    "bad-date",
    new Date(now - 21600001).toISOString(),
    new Date(now + 120000).toISOString(),
  ]) {
    const quality = structuredClone(verified.quality);
    for (const value of Object.values(quality)) value.checkedAt = checkedAt;
    assert.equal(
      evaluateEligibility({ ...verified, quality }, now).eligible,
      false,
    );
  }
});
test("source-less evidence and missing Hebrew copy fail closed", () => {
  const quality = structuredClone(verified.quality);
  quality.rating.source = "percentage-conversion";
  const result = evaluateEligibility(
    { ...verified, title: "English only", quality },
    now,
  );
  assert.ok(result.blockers.includes("rating"));
  assert.ok(result.blockers.includes("hebrew"));
});
