import test from "node:test";
import assert from "node:assert/strict";
import { warrantyFor } from "../lib/dealpilot/product-warranty.ts";
test("unknown warranty must not show a claimed provider or service address", () => {
  assert.equal(warrantyFor("100500000001"), null);
});
