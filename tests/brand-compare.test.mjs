import test from "node:test";
import assert from "node:assert/strict";
import { brandCompareRows } from "../lib/dealpilot/brand-compare.ts";

const item = (id, brand, cat, price, orders = 0, currency = "ILS") => ({ id, brand, categorySlug: cat, price, currency, orders });
const brandOf = (p) => p.brand;

test("brand comparison: current first, then same brand and category by ILS price; others excluded", () => {
  const cur = item("1", "ugreen", "tech", "100");
  const items = [cur, item("2", "ugreen", "tech", "50"), item("3", "ugreen", "tech", "20"), item("4", "anker", "tech", "10"),
    item("5", "ugreen", "home", "5"), item("6", "ugreen", "tech", null, 900), item("7", "ugreen", "tech", "8", 0, "USD")];
  const rows = brandCompareRows(cur, items, brandOf);
  assert.deepEqual(rows.map((r) => r.id), ["1", "3", "2", "6", "7"]);
});

test("brand comparison: nothing to compare without a brand or peers; respects the row cap", () => {
  assert.deepEqual(brandCompareRows(item("1", null, "tech", "1"), [item("2", null, "tech", "1")], brandOf), []);
  assert.deepEqual(brandCompareRows(item("1", "x", "tech", "1"), [item("1", "x", "tech", "1")], brandOf), []);
  const many = Array.from({ length: 10 }, (_, i) => item(String(i + 2), "x", "tech", String(i + 1)));
  assert.equal(brandCompareRows(item("1", "x", "tech", "1"), many, brandOf, 6).length, 6);
});
