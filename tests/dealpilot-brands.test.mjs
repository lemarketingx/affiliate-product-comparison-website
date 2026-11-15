import test from "node:test";
import assert from "node:assert/strict";
import { brands, storeStatus, brandBySlug } from "../lib/dealpilot/brands.ts";
import { israelPriceFor, israelPrices } from "../lib/dealpilot/israel-prices.ts";

test("only a shop named as the brand's official store is accepted", () => {
  const xiaomi = brandBySlug("xiaomi");
  assert.equal(storeStatus(xiaomi, "Xiaomi Official Store"), "name-match");
  assert.equal(storeStatus(xiaomi, "Best Xiaomi Gadgets Shop"), "none");
  assert.equal(storeStatus(xiaomi, "Anker Official Store"), "none");
  assert.equal(storeStatus(xiaomi, null), "none");
});

test("a name match is never reported as verified until the owner verifies", () => {
  for (const b of brands) assert.equal(b.storeVerified, false);
  const verified = { ...brandBySlug("anker"), storeVerified: true };
  assert.equal(storeStatus(verified, "Anker Official Store"), "verified");
});

test("brand slugs are unique", () => {
  assert.equal(new Set(brands.map((b) => b.slug)).size, brands.length);
});

test("Israeli prices: missing and stale entries are hidden", () => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  assert.equal(israelPriceFor("1", now), null);
  israelPrices.push(
    { productId: "fresh", price: 300, store: "Test", url: "https://example.com", checkedAt: "2026-11-10" },
    { productId: "stale", price: 300, store: "Test", url: "https://example.com", checkedAt: "2026-09-01" },
  );
  assert.equal(israelPriceFor("fresh", now)?.price, 300);
  assert.equal(israelPriceFor("stale", now), null);
  israelPrices.length = 0;
});
