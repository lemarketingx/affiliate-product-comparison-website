import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
test("public discovery navigation, filters and explicit unavailable catalog", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "מגלים מוצרים חכמים",
  );
  await expect(
    page.getByRole("link", { name: "מרכז שליטה", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "גלו מוצרים", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/deals/);
  await page.getByRole("button", { name: "רכב ואביזרים", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "רכב ואביזרים", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "הכול", exact: true }).click();
  await page.getByRole("combobox", { name: "סדר מוצרים" }).selectOption("orders");
  await expect(page.getByRole("combobox", { name: "סדר מוצרים" })).toHaveValue("orders");
  await page.getByRole("combobox", { name: "סדר מוצרים" }).selectOption("source");
  await page
    .getByRole("textbox", { name: "סינון לפי שם מוצר" })
    .fill("unmatched");
  await expect(page.getByText("קצת סבלנות, הגילוי בדרך.")).toBeVisible();
  await page.getByRole("textbox", { name: "חיפוש מוצרים" }).fill("organizer");
  await page.getByRole("button", { name: "חיפוש", exact: true }).click();
  await expect(page).toHaveURL(/search\?q=organizer/);
  await expect(
    page.getByRole("textbox", { name: "סינון לפי שם מוצר" }),
  ).toHaveValue("organizer");
  await page.getByRole("textbox", { name: "חיפוש מוצרים" }).fill("kitchen");
  await page.getByRole("button", { name: "חיפוש", exact: true }).click();
  await expect(page).toHaveURL(/search\?q=kitchen/);
  await expect(page.getByRole("textbox", { name: "סינון לפי שם מוצר" })).toHaveValue("kitchen");
});
test("all admin routes and reports refuse unauthenticated access; diagnostic token is insufficient", async ({
  request,
}) => {
  for (const path of [
    "/admin",
    "/admin/dashboard",
    "/admin/products",
    "/admin/orders",
    "/admin/settings",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/admin\/login$/);
  }
  for (const path of [
    "/api/admin/orders",
    "/api/dealpilot/products",
    "/api/dealpilot/stats",
  ]) {
    const response = await request.post(path, {
      headers: {
        "x-dealpilot-admin-token": "diagnostic-token-is-not-a-session",
      },
      data: {},
    });
    expect(response.status()).toBe(401);
  }
});
test("legacy mortgage paths and arbitrary redirect destinations are blocked", async ({
  request,
}) => {
  for (const path of [
    "/setup",
    "/join",
    "/api/portal",
    "/api/campaign",
    "/r/anything",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const redirect = await request.get("/go/12345?url=https://evil.test", {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(404);
  expect(redirect.headers().location).toBeUndefined();
  expect(
    (await request.get("/robots.txt")).headers()["x-robots-tag"],
  ).toContain("noindex");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
});
test("verified local test session opens admin and unknown reporting stays unknown", async ({
  page,
  context,
  request,
}) => {
  const value = await encode({
    secret: process.env.DEALPILOT_QA_SECRET!,
    token: {
      name: "QA administrator",
      email: "qa@example.invalid",
      adminGithubId: "123",
    },
    maxAge: 600,
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "תמונה ברורה",
  );
  await page.getByRole("link", { name: "בדיקת מוצרים", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "הקטלוג אינו זמין כרגע" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "סטודיו תוכן", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "טיוטה שימושית, מתוך הנתונים." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "הזמנות ועמלות", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const report = await context.request.post("/api/admin/orders", {
    headers: { origin: "http://127.0.0.1:3101" },
    data: {
      startTime: "2026-01-01T00:00:00Z",
      endTime: "2026-01-01T12:00:00Z",
      status: "Payment Completed",
    },
  });
  expect(report.status()).toBe(200);
  expect((await report.json()).approvedCommission).toBeNull();
  const crossOrigin = await context.request.post("/api/admin/orders", {
    headers: { origin: "https://evil.test" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  await page.getByRole("button", { name: "יציאה מהמערכת" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(
    (await request.get("/admin/dashboard", { maxRedirects: 0 })).status(),
  ).toBe(307);
});
test("tampered or revoked session cannot authorize admin", async ({
  context,
  page,
}) => {
  const value = await encode({
    secret: process.env.DEALPILOT_QA_SECRET!,
    token: { name: "removed", adminGithubId: "999" },
    maxAge: 600,
  });
  await context.addCookies([
    { name: "next-auth.session-token", value, domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login/);
});
for (const width of [375, 412, 768, 1366, 1920]) {
  test("responsive RTL without overflow at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    if (width < 800) {
      await page.locator(".dp-mobile-menu summary").click();
      await expect(
        page.getByRole("navigation", { name: "ניווט נייד" }),
      ).toBeVisible();
    }
    await expect(page.locator(".dp-hero h1")).toBeVisible();
  });
}
