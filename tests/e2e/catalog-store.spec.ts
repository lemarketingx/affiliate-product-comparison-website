import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";

// Port 3101 server: no AliExpress credentials, no catalog database, no CRON_SECRET.
// Verifies the new job/admin surfaces fail closed and report their real state.

test("cron endpoint fails closed without CRON_SECRET", async ({ request }) => {
  const none = await request.get("/api/cron/catalog");
  expect(none.status()).toBe(401);
  const forged = await request.get("/api/cron/catalog", { headers: { authorization: "Bearer undefined" } });
  expect(forged.status()).toBe(401);
  expect(none.headers()["cache-control"]).toContain("no-store");
});

test("admin catalog API rejects anonymous callers", async ({ request }) => {
  const res = await request.post("/api/admin/catalog", { data: { action: "run" } });
  expect(res.status()).toBe(401);
});

test("admin catalog page states that the store is not connected", async ({ page, context }) => {
  const value = await encode({
    secret: process.env.DEALPILOT_QA_SECRET!,
    token: { name: "QA administrator", email: "qa@example.invalid", adminGithubId: "123" },
    maxAge: 600,
  });
  await context.addCookies([{ name: "next-auth.session-token", value, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/catalog");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("קטלוג, ייבוא ומחירים");
    await expect(page.getByText(/מסד נתונים ייעודי .*לא מוגדר/)).toBeVisible();
    await expect(page.getByRole("button", { name: "ייבוא מוצרים עכשיו" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "בדיקת מחירים עכשיו" })).toBeDisabled();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/admin-catalog-${width}.png`, fullPage: true });
  }
  // Reachable from the admin menu.
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("link", { name: "קטלוג, ייבוא ומחירים" })).toBeVisible();
});
