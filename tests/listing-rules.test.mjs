import test from "node:test";
import assert from "node:assert/strict";
import { identifyListedBrand } from "../lib/dealpilot/brands.ts";
import { cleanListingTitle, resolveCategory } from "../lib/dealpilot/listing-rules.ts";

// Real rows from the production catalog audit, 2026-11-17.
test("a multi-brand parts store does not corroborate a brand (real Dreame parts listing)", () => {
  const row = { title: "חלקי Dreame X50 Ultra/X50 Master/L50 Pro Ultra/L40S Pro Ultra", shopName: "Roborock ECOVACS Dreame Vacuum Cleaner Parts Store Store" };
  assert.equal(identifyListedBrand(row), null);
});

test("single-brand stores, including Choice and Co.,Ltd. stores, still corroborate", () => {
  assert.equal(identifyListedBrand({ title: "מטען Baseus 45W GaN", shopName: "BASEUS Co.,Ltd. Store" })?.slug, "baseus");
  assert.equal(identifyListedBrand({ title: "ROCKBROS גרבי ספורט", shopName: "ROCKBROS Choice Store" })?.slug, "rockbros");
  assert.equal(identifyListedBrand({ title: "כבל UGREEN 3A USB C", shopName: "Ugreen Official Store" })?.slug, "ugreen");
});

test("a parts store named after one brand does not corroborate either", () => {
  assert.equal(identifyListedBrand({ title: "Dreame L10 filter", shopName: "Dreame Parts Store" }), null);
});

test("seller sale banners are removed from titles; descriptive brackets stay", () => {
  assert.equal(cleanListingTitle("מבצע חדש: מטען Baseus 140W GaN PD Charger USB C Charger"), "מטען Baseus 140W GaN PD Charger USB C Charger");
  assert.equal(cleanListingTitle("【Top Sale】UGREEN עכבר אלחוטי ארגונומי עכבר 4000 DPI"), "UGREEN עכבר אלחוטי ארגונומי עכבר 4000 DPI");
  assert.equal(cleanListingTitle("【קטן במיוחד】מטען UGREEN Nexode Air 65W GaN"), "【קטן במיוחד】מטען UGREEN Nexode Air 65W GaN");
  assert.equal(cleanListingTitle("UGREEN【תאימות מערכת כפולה】מציא חכם עבור Apple Find My"), "UGREEN【תאימות מערכת כפולה】מציא חכם עבור Apple Find My");
  assert.equal(cleanListingTitle("מבצע"), "מבצע", "never empties a title");
});

test("the car category needs a car word in the title (Baseus car search returns wall chargers)", () => {
  assert.deepEqual(resolveCategory("מטען Baseus 30W GaN לאייפון 17 16 15", "car", "tech"), { slug: "tech", label: "טכנולוגיה וטעינה" });
  assert.equal(resolveCategory("מטען לרכב Baseus 30W טעינה מהירה", "car", "tech"), null);
  assert.equal(resolveCategory("משאבת אוויר ניידת אלחוטית Baseus לרכבים", "car", "tech"), null);
  assert.equal(resolveCategory("70mai A510 4K", "car", "car"), null, "car-first brands stay in car");
  assert.equal(resolveCategory("UGREEN כבל", "tech", "tech"), null, "other categories are untouched");
  assert.equal(resolveCategory("Baseus carbon fiber SD card reader", "car", "tech")?.slug, "tech", "no substring match on car");
});
