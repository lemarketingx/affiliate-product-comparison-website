import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { mkdir, readFile } from "node:fs/promises";

test.use({ baseURL: "http://127.0.0.1:3102" });
test("unverified supplier candidates stay private while local review and content export work", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60000);
  const title = "TEST FIXTURE — מארגן כבלים לבדיקה בלבד";
  await page.route(
    "https://ae01.alicdn.com/dealpilot-test-fixture-*.png",
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e9f1ff"/><rect x="90" y="120" width="220" height="160" rx="24" fill="#2563eb"/><text x="200" y="310" text-anchor="middle" font-size="18" fill="#0f172a">TEST FIXTURE</text></svg>',
      }),
  );
  await page.goto("/deals");
  await expect(page.locator(".dp-product")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "המוצרים הבאים שלנו עדיין בבדיקה" }),
  ).toBeVisible();
  await page.goto("/products/1005001234567");
  await expect(
    page.getByRole("heading", { name: "המוצר אינו זמין כרגע" }),
  ).toBeVisible();
  const redirect = await request.get(
    "/go/1005001234567?url=https://evil.test",
    { maxRedirects: 0 },
  );
  expect(redirect.status()).toBe(404);
  expect(redirect.headers().location).toBeUndefined();
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
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto("/admin/products");
  await expect(
    page.getByRole("heading", { name: "בדיקת מועמד" }),
  ).toBeVisible();
  const approve = page.getByRole("button", {
    name: "אישור מקומי",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  await page
    .getByRole("button", { name: /TEST FIXTURE — מועמד ללא מחיר וקידום/ })
    .click();
  await page.getByRole("checkbox").check();
  await expect(approve).toBeDisabled();
  await expect(page.getByText(/האישור חסום:/)).toBeVisible();
  await page.getByRole("button", { name: "דחייה מקומית" }).click();
  await expect(page.locator(".dp-review-heading .dp-tag")).toHaveText(
    "נדחה בלשונית",
  );
  await page
    .getByRole("button", { name: /TEST FIXTURE — מארגן כבלים לבדיקה בלבד/ })
    .click();
  await page.getByRole("checkbox").check();
  await approve.click();
  await expect(page.locator(".dp-review-heading .dp-tag")).toHaveText(
    "אושר בלשונית",
  );
  await mkdir("outputs/qa", { recursive: true });
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({
    path: "outputs/qa/admin-populated-desktop-viewport.png",
  });
  await page.screenshot({
    path: "outputs/qa/admin-populated-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "סטודיו תוכן", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "תוכן לבדיקה" })).toHaveValue(
    /גילוי נאות/,
  );
  await page.getByLabel("פורמט טיוטה").selectOption("shorts");
  await expect(page.getByRole("textbox", { name: "תוכן לבדיקה" })).toHaveValue(
    /תסריט מוצע לבדיקה/,
  );
  await page.getByLabel("פורמט טיוטה").selectOption("instagram");
  await expect(page.getByRole("textbox", { name: "תוכן לבדיקה" })).toHaveValue(
    /#קישור_שותפים/,
  );
  await page.getByLabel("פורמט טיוטה").selectOption("telegram");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "העתקת טיוטה" }).click();
  await expect(page.getByRole("status")).toContainText("הטיוטה הועתקה");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "קישור שותפים",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "הורדת טקסט" }).click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!, "utf8");
  expect(exported).toContain(title);
  expect(exported).toContain("קישור שותפים");
  expect(exported).toContain("TEST_FIXTURE_ONLY");
  await page.getByRole("link", { name: "בדיקת מוצרים", exact: true }).click();
  await page
    .getByRole("textbox", { name: "כותרת לעריכה" })
    .fill("TEST FIXTURE — כותרת שנערכה");
  await expect(page.locator(".dp-review-heading .dp-tag")).toHaveText(
    "ממתין לבדיקה",
  );
  await expect(approve).toBeDisabled();
  await page.getByRole("link", { name: "סטודיו תוכן", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "אין מוצרים מאושרים בלשונית" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "בדיקת מוצרים", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  const adminMenu = page.getByRole("button", { name: /תפריט ניהול/ });
  await expect(adminMenu).toHaveAttribute("aria-expanded", "false");
  await adminMenu.click();
  await expect(adminMenu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "ניהול DealPilot" }).getByRole("link"),
  ).toHaveCount(8);
  await expect(
    page.getByRole("link", { name: "הגדרות", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: "outputs/qa/admin-populated-mobile-menu.png" });
  await page.keyboard.press("Escape");
  await expect(adminMenu).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({
    path: "outputs/qa/admin-populated-mobile-viewport.png",
  });
  await page.screenshot({
    path: "outputs/qa/admin-populated-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "כותרת לעריכה" })).toHaveValue(
    title,
  );
  await expect(page.locator(".dp-review-heading .dp-tag")).toHaveText(
    "ממתין לבדיקה",
  );
  // A custom supplier search must survive navigation to Content Studio without entering the public catalog.
  await adminMenu.click();
  await page.getByRole("link", { name: "Product Scout", exact: true }).click();
  await expect(adminMenu).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("textbox", { name: /חיפוש חדש ב־AliExpress/ })
    .fill("custom fixture");
  await page.getByRole("button", { name: "חיפוש מוצרים", exact: true }).click();
  await page
    .getByRole("button", { name: /TEST FIXTURE — תוצאה מותאמת לשמירה בלשונית/ })
    .click();
  await page.getByRole("checkbox").check();
  await approve.click();
  await adminMenu.click();
  await page.getByRole("link", { name: "סטודיו תוכן", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "תוכן לבדיקה" })).toHaveValue(
    /TEST_CUSTOM_FIXTURE_ONLY/,
  );
  await expect(page.locator("time")).toBeVisible();
  expect((await request.get("/products/1005003333333")).status()).toBe(200);
  expect(await (await request.get("/products/1005003333333")).text()).toContain(
    "המוצר אינו זמין כרגע",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "אין מוצרים מאושרים בלשונית" }),
  ).toBeVisible();
});
