import test from "node:test";
import assert from "node:assert/strict";
import { postDrafts } from "../lib/marketing/post-drafts.ts";

const item = (id, orders, extra = {}) => ({ id, title: "מוצר " + id, price: "48.90", currency: "ILS", priceStatus: "current", priceObservedAt: "2026-11-23T07:00:00Z", orders, ...extra });
const opts = { origin: "https://site.example", channel: "telegram", brandOf: () => "UGREEN", now: new Date("2026-11-23T10:00:00Z") };

test("drafts carry the check time, provider-sales label, disclosure and a tagged product-page link", () => {
  const [d] = postDrafts([item("1", 900)], { ...opts, count: 1 });
  assert.match(d.text, /₪/);
  assert.match(d.text, /נבדק .*ייתכן שהשתנה/);
  assert.match(d.text, /מכירות מדווחות לפי הספק/);
  assert.match(d.text, /קישור שותפים/);
  assert.match(d.text, /https:\/\/site\.example\/products\/1\?utm_source=telegram/);
  assert.doesNotMatch(d.text, /הנחה|הכי זול|מבצע/);
});

test("withheld, priceless, unbranded or sales-less products are never drafted", () => {
  const items = [item("a", 10, { priceStatus: "stale" }), item("b", 10, { price: null }), item("c", 0), item("d", 10, { priceObservedAt: null })];
  assert.deepEqual(postDrafts(items, opts), []);
  assert.deepEqual(postDrafts([item("e", 10)], { ...opts, brandOf: () => null }), []);
});

test("rotates daily without repeats inside a day", () => {
  const items = Array.from({ length: 12 }, (_, i) => item(String(i), 1000 - i));
  const d1 = postDrafts(items, { ...opts, count: 5 }).map((d) => d.id);
  const d2 = postDrafts(items, { ...opts, count: 5, now: new Date("2026-11-24T10:00:00Z") }).map((d) => d.id);
  assert.equal(new Set(d1).size, 5);
  assert.notDeepEqual(d1, d2);
});
