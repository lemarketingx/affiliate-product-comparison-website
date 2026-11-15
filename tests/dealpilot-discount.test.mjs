import test from "node:test";
import assert from "node:assert/strict";
import { pickOriginalPrice } from "../lib/dealpilot/urls.ts";

test("original price kept only when same currency and higher", () => {
  assert.equal(pickOriginalPrice("150.00", "ILS", "100.00", "ILS"), "150.00");
  assert.equal(pickOriginalPrice("150.00", "USD", "100.00", "ILS"), null);
  assert.equal(pickOriginalPrice("90.00", "ILS", "100.00", "ILS"), null);
  assert.equal(pickOriginalPrice(null, null, "100.00", "ILS"), null);
  assert.equal(pickOriginalPrice("abc", "ILS", "100.00", "ILS"), null);
});
