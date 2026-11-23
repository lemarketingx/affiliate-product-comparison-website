import test from "node:test";
import assert from "node:assert/strict";
import { productDisplayTitle } from "../lib/dealpilot/product-titles.ts";
import { productsCount, identifiedProductsCount } from "../lib/dealpilot/copy.ts";

test("short Hebrew titles retain only explicitly stated attributes", () => {
  assert.equal(productDisplayTitle("מנהל כבלים Toocki Wire Winder מנהל כבל USB מגן אוזניות עכבר חוטים", "Toocki"), "מארגן כבלים Toocki");
  assert.equal(productDisplayTitle("כבל Baseus מסוג USB-C ל-USB-C, טעינה מהירה 100W/5A לאייפון", "Baseus"), "כבל Baseus USB-C ל־USB-C 100W");
  assert.equal(productDisplayTitle("מטען UGREEN Nexode Air 65W GaN", "UGREEN"), "מטען UGREEN Nexode Air 65W");
  assert.equal(productDisplayTitle("אוזניות Baseus EP10 Bluetooth ANC", "Baseus"), "אוזניות Baseus ANC");
  assert.equal(productDisplayTitle("עכבר אלחוטי UGREEN 5000DPI", "UGREEN"), "עכבר UGREEN אלחוטי 5,000DPI");
});

test("unknown identities are not manufactured", () => {
  assert.equal(productDisplayTitle("מכשיר מקורי מומלץ למטבח", null), "מכשיר מקורי מומלץ למטבח");
  assert.equal(productDisplayTitle("מצלמת דרך 4K", null), "מצלמת דרך 4K");
  assert.ok(!productDisplayTitle("מטען Baseus 25W/65W", "Baseus").includes("25W"));
});

test("Hebrew product counts use singular properly", () => {
  assert.equal(productsCount(1), "מוצר אחד");
  assert.equal(productsCount(2), "2 מוצרים");
  assert.equal(identifiedProductsCount(1), "מוצר מזוהה אחד");
});
