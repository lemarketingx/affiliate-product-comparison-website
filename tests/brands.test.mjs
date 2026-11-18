import test from "node:test";
import assert from "node:assert/strict";
import { BRANDS, identifyListedBrand } from "../lib/dealpilot/brands.ts";

test("brand-only registry contains unique, curated brand slugs", () => {
  assert.equal(new Set(BRANDS.map(x => x.slug)).size, BRANDS.length);
  assert.ok(BRANDS.length >= 12);
});

test("brand matching requires corroboration, not a title alone", () => {
  assert.equal(identifyListedBrand({ title: "Baseus מטען", shopName: "Unknown seller" }), null);
  assert.equal(identifyListedBrand({ title: "מטען אקראי", shopName: "Baseus Official Store" }), null);
  assert.equal(identifyListedBrand({ title: "Baseus מטען מקורי לפי מוכר", shopName: "Baseus Store" })?.slug, "baseus");
  assert.equal(identifyListedBrand({ title: "מטען Anker", supplierBrand: "Anker", shopName: null })?.slug, "anker");
  assert.equal(identifyListedBrand({ title: "Banker power bank", shopName: "Banker store" }), null);
  assert.equal(identifyListedBrand({ title: "סמארטפון שיאומי", shopName: "Xiaomi Store" })?.slug, "xiaomi");
  assert.equal(identifyListedBrand({ title: "70mai מצלמת רכב", shopName: "70mai Store" })?.slug, "70mai");
});

test("brands added from catalog data need store corroboration like any other (2026-11-18)", () => {
  assert.equal(identifyListedBrand({ title: "Vention כבל USB C 100W", shopName: "VEnTIOn Official Store" })?.slug, "vention");
  assert.equal(identifyListedBrand({ title: "Haylou S40 אוזניות", shopName: "Haylou Flagship Store" })?.slug, "haylou");
  assert.equal(identifyListedBrand({ title: "Nothing Ear (a) אוזניות", shopName: "Nothing Flagship Store" })?.slug, "nothing");
  // A seller title naming the brand is not enough without the store or a brand field.
  assert.equal(identifyListedBrand({ title: "כבל תואם Vention", shopName: "Stone's Store" }), null);
  assert.equal(identifyListedBrand({ title: "nothing special charger", shopName: "Generic Store" }), null);
});
