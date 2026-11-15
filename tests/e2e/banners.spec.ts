import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { mkdir } from "node:fs/promises";

const SHOTS = "outputs/qa/banners";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#ffc83d"/><text x="320" y="190" text-anchor="middle" font-size="28" fill="#14161b">TEST FIXTURE</text></svg>';

test("no API: homepage falls back to regular category banners, no affiliate claim", async ({ page }) => {
  await page.goto("/");
  const strip = page.locator(".fp-banners");
  await expect(strip.getByRole("heading", { name: "מאיפה מתחילים?" })).toBeVisible();
  await expect(strip.locator(".fp-banner.is-category")).toHaveCount(3);
  await expect(strip).not.toContainText("קישורי שותפים");
  await expect(strip.locator("a").first()).toHaveAttribute("href", /^\/categories\//);
});

test.describe("official campaigns (isolated fixture API on 3104)", () => {
  test.use({ baseURL: "http://127.0.0.1:3104" });
  test("only active campaigns with a verified generated link are shown; links redirect; admin reports status", async ({ page, request, context }) => {
    await mkdir(SHOTS, { recursive: true });
    await page.route(/https:\/\/ae01\.alicdn\.com\/.*/, (r) => r.fulfill({ contentType: "image/svg+xml", body: svg }));
    await page.goto("/");
    const strip = page.locator(".fp-banners");
    await expect(strip.getByRole("heading", { name: "מה רץ עכשיו ב־AliExpress" })).toBeVisible();
    const cards = strip.locator(".fp-banner");
    await expect(cards).toHaveCount(3);
    await expect(strip).toContainText("TEST FIXTURE Hot Product");
    await expect(strip).toContainText("TEST FIXTURE Weekly Deals");
    await expect(strip).toContainText("TEST FIXTURE Best Seller");
    await expect(strip).not.toContainText("Ended Sale"); // expired → removed
    await expect(strip).not.toContainText("Broken"); // no valid link → not published
    await expect(cards.filter({ hasText: "Weekly Deals" })).toContainText("בתוקף עד");
    await expect(cards.filter({ hasText: "Hot Product" })).toContainText("תוקף הקמפיין לא דווח");
    await expect(strip).toContainText("ייחוס העמלה בחשבון השותפים טרם אומת");
    await expect(strip).not.toContainText(/\d+%|הנחה/); // no invented discounts
    const hrefs = await cards.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
    expect(hrefs.every((h) => /^\/go\/b\/f-\d+-[a-z0-9-]+\?source=banner$/.test(h))).toBe(true);
    for (const h of hrefs) {
      const r = await request.get(h, { maxRedirects: 0 });
      expect(r.status()).toBe(307);
      expect(r.headers().location).toMatch(/^https:\/\/s\.click\.aliexpress\.com\/e\/TEST_BANNER_\d+$/);
    }
    expect((await request.get("/go/b/f-1-test-fixture-ended-sale", { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get("/go/b/f-3-test-fixture-broken", { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get("/go/b/x?url=https://evil.test", { maxRedirects: 0 })).status()).toBe(404);
    for (const [w, h, name] of [[1440, 1000, "desktop"], [375, 812, "mobile"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await strip.scrollIntoViewIfNeeded();
      await strip.screenshot({ path: `${SHOTS}/home-banners-${name}.png` });
    }

    const value = await encode({
      secret: process.env.DEALPILOT_QA_SECRET!,
      token: { name: "QA administrator", email: "qa@example.invalid", adminGithubId: "123" },
      maxAge: 600,
    });
    await context.addCookies([{ name: "next-auth.session-token", value, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/admin/banners");
    await expect(page.getByRole("heading", { name: "באנרים וקמפיינים" })).toBeVisible();
    await expect(page.locator("body")).toContainText("ALIEXPRESS_TRACKING_ID: מוגדר (de********qa)");
    const row = (t: string) => page.locator("tr", { hasText: t });
    await expect(row("Ended Sale")).toContainText("הסתיים · הוסר");
    await expect(row("Broken")).toContainText("חסום");
    await expect(row("Hot Product")).toContainText("מפורסם (קישור תקין)");
    await expect(row("Hot Product")).toContainText("s.click.aliexpress.com/e/TE…");
    await expect(page.locator("body")).not.toContainText("TEST_BANNER_"); // full tracking links never shown
    await expect(page.locator("body")).toContainText("ייחוס עמלות: טרם אומת");
    await page.getByRole("button", { name: "בדיקת הפניות של קישורי הבאנרים" }).click();
    await expect(page.getByRole("status").filter({ hasText: "נבדקו" })).toContainText("נבדקו 3 קישורים · 3 הפנו ל־AliExpress");
    await expect(page.locator("body")).toContainText("הפניות תקינות: 3 מתוך 3");
    await expect(row("Hot Product")).toContainText("302 s.click.aliexpress.com → 200 www.aliexpress.com");
    // Parameter-by-parameter diagnosis against the (fixture) API.
    await page.getByRole("button", { name: /אבחון link.generate/ }).click();
    const probe = page.locator("table").filter({ hasText: "מה שונה" });
    await expect(probe).toBeVisible();
    const vrow = (n: string) => probe.locator("tbody tr").filter({ has: page.locator("td:first-child", { hasText: new RegExp("^" + n + "$") }) });
    await expect(vrow("A")).toContainText("200 ✓");
    await expect(vrow("A")).toContainText("כתובת מוצר קנונית");
    await expect(vrow("A")).toContainText("הוחזר וזהה");
    await expect(vrow("D")).toContainText("PROVIDER_RESULT_402_INVALID_PARAMETER");
    await expect(vrow("D")).toContainText("tracking_id");
    await expect(vrow("E")).toContainText("PROVIDER_RESULT_402_INVALID_PARAMETER");
    await expect(vrow("E")).toContainText("[url]"); // provider echo of URLs is redacted
    await expect(probe).not.toContainText("dealpilot-qa");
    await expect(probe).not.toContainText("gatewayAdapt");
    await page.screenshot({ path: `${SHOTS}/admin-banners.png`, fullPage: true });
  });
});
