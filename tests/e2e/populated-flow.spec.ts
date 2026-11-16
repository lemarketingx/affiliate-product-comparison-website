import { test, expect } from "@playwright/test";

// Port 3102: default provider fixture (TEST FIXTURE data). One branded product
// (Baseus, corroborated by title + shop) is publishable; an unbranded item with no
// price, and a USD-only item, must stay out. Rewritten 2026-11-16 for the
// brand-first catalog and the "השורה התחתונה" shopping flow.
test.use({ baseURL: "http://127.0.0.1:3102" });
const ID = "1005001234567";
const TITLE = /Baseus מטען מהיר 65W/;

test("branded catalog → product receipt → tracked affiliate redirect", async ({ page, request }) => {
  test.setTimeout(90000);
  await page.route("https://ae01.alicdn.com/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e9f1ff"/><text x="200" y="210" text-anchor="middle" font-size="22">TEST FIXTURE</text></svg>' }),
  );
  // Cold catalog builds in the background by design: wait for it.
  await expect
    .poll(async () => { await page.goto("/deals"); return page.locator(".dp-product").count(); }, { timeout: 30000, intervals: [1000, 2000] })
    .toBe(1);
  const card = page.locator(".dp-product");
  await expect(card).toContainText(TITLE);
  await expect(card.getByRole("link", { name: /^לכל מוצרי המותג Baseus/ })).toBeVisible();
  // Price is shown once, in shekels, readable; unverified quality is said plainly.
  await expect(card.locator(".dp-product-price strong")).toHaveText(/₪/);
  await expect(card.locator(".dp-product-price")).not.toContainText("$");
  await expect(card).toContainText("איכות ומקוריות טרם אומתו");
  await expect(card).toContainText("כולל קישור שותפים");
  // Excluded: unbranded/no-price and USD-only candidates never reach the catalog.
  await expect(page.locator("body")).not.toContainText("מועמד ללא מחיר וקידום");
  await expect(page.locator("body")).not.toContainText("מחיר דולר שאסור להציג כשקלים");
  // Product image renders (fixture image, real <img>).
  const img = card.locator("img");
  await expect(img).toBeVisible();
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

  // Header search finds it by brand.
  await page.getByRole("textbox", { name: "חיפוש מותגים ומוצרים" }).fill("Baseus");
  await page.getByRole("banner").getByRole("button", { name: "חיפוש", exact: true }).click();
  await expect(page).toHaveURL(/search\?q=Baseus/);
  await expect(page.locator(".dp-product")).toHaveCount(1);

  // Product page: one h1, receipt with the price, CTA through /go.
  await page.locator(".dp-product").getByRole("link", { name: /^פרטי / }).click();
  await expect(page).toHaveURL(new RegExp(`/products/${ID}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(TITLE);
  const receipt = page.getByRole("region", { name: "מחיר וקנייה" });
  await expect(receipt.locator("strong").first()).toHaveText(/12\.50/);
  await expect(receipt).toContainText("השורה התחתונה");
  await expect(page.locator(".dp-selection-policy")).toContainText("איכות ומקוריות לא אומתו");
  const cta = receipt.getByRole("link", { name: /לבדיקת המוצר ב־AliExpress/ });
  await expect(cta).toHaveAttribute("href", `/go/${ID}?source=catalog`);
  await expect(cta).toHaveAttribute("rel", /sponsored/);

  // Redirect ignores any visitor-supplied destination and goes to the stored affiliate link.
  // Legacy (no-database) path answers 503 + Retry-After while a cold catalog builds; retry like a browser would.
  let redirect = await request.get(`/go/${ID}?url=https://evil.test`, { maxRedirects: 0 });
  for (let i = 0; i < 10 && redirect.status() === 503; i++) {
    await page.waitForTimeout(2000);
    redirect = await request.get(`/go/${ID}?url=https://evil.test`, { maxRedirects: 0 });
  }
  expect(redirect.status()).toBe(307);
  expect(redirect.headers().location).toBe("https://s.click.aliexpress.com/e/TEST_FIXTURE_ONLY");
  expect((await request.get("/go/1005007654321", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/go/1005001111111", { maxRedirects: 0 })).status()).toBe(404);

  // Brand page lists it.
  await page.goto("/brands/baseus");
  await expect(page.locator(".dp-product")).toContainText(TITLE);

  // Mobile: no horizontal scroll; sticky buy bar shows the price.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/products/${ID}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".bl-buybar")).toBeVisible();
  await expect(page.locator(".bl-buybar strong")).toHaveText(/12\.50/);
});
