import test from "node:test";
import assert from "node:assert/strict";
import { productJsonLd, breadcrumbJsonLd, itemListJsonLd, jsonLdString } from "../lib/seo/structured-data.ts";

const O = "https://site.example";
const base = { id: "1005", title: "UGREEN מטען", image: "https://ae01.alicdn.com/a.jpg", images: [], price: "48.90", currency: "ILS", priceStatus: "current", category: "טכנולוגיה" };

test("product JSON-LD: offer only for a current price, in its own currency; no ratings or availability", () => {
  const d = productJsonLd(base, O, "UGREEN");
  assert.deepEqual(d.offers, { "@type": "Offer", url: O + "/products/1005", price: "48.90", priceCurrency: "ILS" });
  assert.equal(d.brand.name, "UGREEN");
  for (const k of ["aggregateRating", "review"]) assert.equal(k in d, false);
  assert.equal("availability" in d.offers, false);
  assert.equal(productJsonLd({ ...base, priceStatus: "stale" }, O, null).offers, undefined);
  assert.equal(productJsonLd({ ...base, price: null }, O, null).offers, undefined);
  assert.equal(productJsonLd({ ...base, currency: null }, O, null).offers, undefined);
  assert.equal(productJsonLd(base, O, null).brand, undefined);
  assert.equal(productJsonLd({ ...base, priceStatus: undefined, currency: "USD" }, O, null).offers.priceCurrency, "USD");
});

test("only https images; breadcrumbs and item lists use the public origin", () => {
  assert.deepEqual(productJsonLd({ ...base, images: ["http://x/a.jpg", "https://ae01.alicdn.com/b.jpg"] }, O, null).image, ["https://ae01.alicdn.com/b.jpg"]);
  assert.equal(breadcrumbJsonLd(O, [{ name: "בית", path: "/" }]).itemListElement[0].item, O + "/");
  assert.equal(itemListJsonLd(O, ["1", "2"]).itemListElement[1].url, O + "/products/2");
});

test("JSON-LD cannot break out of its script tag", () => {
  assert.equal(jsonLdString({ name: "</script><script>x" }).includes("</script>"), false);
});
