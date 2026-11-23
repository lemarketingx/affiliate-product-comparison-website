import test from "node:test";
import assert from "node:assert/strict";
import { encodeCatalogCache, decodeCatalogCache } from "../lib/catalog-store/cache-codec.ts";

test("a full catalog larger than 2MB is cached losslessly below the item limit", () => {
  const rows = Array.from({ length: 1200 }, (_, i) => ({
    product_id: String(1005000000000000 + i),
    title: "כבל טעינה USB C Baseus למחשב ולטלפון " + i,
    price: i / 10,
    currency: "ILS",
    images: Array.from({ length: 4 }, (_, j) =>
      "https://ae01.alicdn.com/kf/" + i + "/" + j + "/" + "image".repeat(90) + ".jpg"),
    image: "https://ae01.alicdn.com/kf/" + i + "/cover.jpg",
    affiliate_url: "https://s.click.aliexpress.com/e/" + i,
    last_seen_at: "2026-11-23T12:00:00.000Z",
  }));
  const rawBytes = Buffer.byteLength(JSON.stringify(rows));
  assert.ok(rawBytes > 2 * 1024 * 1024, "fixture must reproduce the original cache overflow");
  const encoded = encodeCatalogCache(rows);
  assert.ok(Buffer.byteLength(JSON.stringify(encoded)) < 2 * 1024 * 1024, "compressed Next cache item fits");
  assert.deepEqual(decodeCatalogCache(encoded), rows, "all images, timestamps and prices are unchanged");
});
test("broken cached data is rejected, never silently substituted", () => {
  assert.throws(() => decodeCatalogCache("invalid"));
});
