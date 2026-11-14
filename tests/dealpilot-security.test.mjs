import test from "node:test";
import assert from "node:assert/strict";
import { safeAliUrl, formatMoney } from "../lib/dealpilot/urls.ts";
import { allowedAdminId } from "../lib/dealpilot/auth-policy.ts";
import { allowRequest } from "../lib/dealpilot/rate-limit.ts";
import { sameRequestOrigin } from "../lib/dealpilot/request-origin.ts";
import { supabaseConfig } from "../lib/supabase/config.ts";

test("redirect allowlist rejects lookalikes, credentials, ports and unsafe schemes", () => {
  for (const url of [
    "https://aliexpress.com.evil.test/item/1",
    "https://aliexpress.com@evil.test",
    "javascript:alert(1)",
    "http://aliexpress.com/item/1",
    "https://user:pass@aliexpress.com/item/1",
    "https://aliexpress.com:444/item/1",
    "//aliexpress.com/item/1",
  ])
    assert.equal(safeAliUrl(url), null, url);
  assert.equal(
    safeAliUrl("https://s.click.aliexpress.com/e/test"),
    "https://s.click.aliexpress.com/e/test",
  );
  assert.equal(safeAliUrl("https://ae01.alicdn.com/image.jpg"), null);
  assert.ok(safeAliUrl("https://ae01.alicdn.com/image.jpg", true));
});
test("authorization uses exact immutable GitHub ID membership and fails closed", () => {
  assert.equal(allowedAdminId("123", "123, 456"), true);
  for (const value of ["12", "1234", "admin", 123, null, undefined])
    assert.equal(allowedAdminId(value, "123,456"), false);
  assert.equal(allowedAdminId("123", undefined), false);
});
test("quota guard refuses excess calls and resets after the window", () => {
  assert.equal(allowRequest("test-window", 2, 1000, 100), true);
  assert.equal(allowRequest("test-window", 2, 1000, 101), true);
  assert.equal(allowRequest("test-window", 2, 1000, 102), false);
  assert.equal(allowRequest("test-window", 2, 1000, 1100), true);
});
test("missing and invalid money remains unknown rather than a zero price", () => {
  for (const value of [null, "NaN", "-4", "0", "Infinity"])
    assert.equal(formatMoney(value, "USD"), "מחיר אינו זמין");
  assert.match(formatMoney("9.9", "USD"), /9.90/);
});
test("CSRF check uses browser Host while rejecting foreign origins and missing Origin", () => {
  const request = (origin, host = "127.0.0.1:3101") =>
    new Request("http://localhost:3101/api/admin/orders", {
      headers: { host, ...(origin ? { origin } : {}) },
    });
  assert.equal(sameRequestOrigin(request("http://127.0.0.1:3101")), true);
  assert.equal(sameRequestOrigin(request("https://127.0.0.1:3101")), false);
  assert.equal(sameRequestOrigin(request("http://evil.test")), false);
  assert.equal(sameRequestOrigin(request(null)), false);
});
test("legacy Supabase configuration stays disconnected even when old variables exist", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://legacy.example.supabase.co";
  assert.equal(supabaseConfig(), null);
  if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
});
