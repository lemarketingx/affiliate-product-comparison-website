import test from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatShekels } from "../lib/dealpilot/urls.ts";

test("ILS prices show shekel before the amount with grouped digits and two decimals", () => {
  assert.equal(formatMoney("5.90", "ILS"), "₪\u00a05.90");
  assert.equal(formatMoney("12345.5", "ILS"), "₪\u00a012,345.50");
  assert.equal(formatShekels(0), "₪\u00a00.00");
  assert.equal(formatShekels(5.9), "₪\u00a05.90");
  assert.doesNotMatch(formatMoney("5.90", "ILS"), /[\u200e\u200f\u202a-\u202e]/);
});

test("other currencies and missing prices retain meaningful display", () => {
  assert.equal(formatMoney("9.5", "USD"), "$9.50");
  assert.equal(formatMoney(null, "ILS"), "מחיר אינו זמין");
  assert.equal(formatMoney("0", "ILS"), "מחיר אינו זמין");
  assert.equal(formatMoney("oops", "ILS"), "מחיר אינו זמין");
});
