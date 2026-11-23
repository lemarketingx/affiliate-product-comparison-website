import test from "node:test";
import assert from "node:assert/strict";
import { priceHistorySeries } from "../lib/catalog-store/price-view.ts";

const row = (at, price, extra = {}) => ({ observed_at: at, price, currency: "ILS", sku_id: "1", ...extra });

test("price history keeps only the shown currency and variant, sorted by time", () => {
  const h = priceHistorySeries([
    row("2026-11-20T04:00:00Z", "10.49"),
    row("2026-11-18T04:00:00Z", "10.19"),
    row("2026-11-19T04:00:00Z", "2.9", { currency: "USD" }),
    row("2026-11-19T05:00:00Z", "55", { sku_id: "2" }),
    row("2026-11-21T04:00:00Z", "0"),
    row("bad", "11"),
  ], { currency: "ILS", skuId: "1" });
  assert.deepEqual(h.points, [{ at: "2026-11-18T04:00:00Z", price: 10.19 }, { at: "2026-11-20T04:00:00Z", price: 10.49 }]);
  assert.equal(h.min, 10.19);
  assert.equal(h.max, 10.49);
  assert.equal(h.checks, 2);
  assert.equal(h.first, "2026-11-18T04:00:00Z");
});

test("no chart from fewer than two observations, or with no currency", () => {
  assert.equal(priceHistorySeries([row("2026-11-18T04:00:00Z", 10)], { currency: "ILS" }), null);
  assert.equal(priceHistorySeries([row("2026-11-18T04:00:00Z", 10), row("2026-11-19T04:00:00Z", 11)], { currency: null }), null);
  assert.equal(priceHistorySeries([row("2026-11-18T04:00:00Z", 10), row("2026-11-19T04:00:00Z", 11)], { currency: "ILS", skuId: "9" }), null);
});

test("without a known variant every observation in the currency counts", () => {
  const h = priceHistorySeries([row("2026-11-18T04:00:00Z", 10, { sku_id: null }), row("2026-11-19T04:00:00Z", 11)], { currency: "ILS", skuId: null });
  assert.equal(h.checks, 2);
});
