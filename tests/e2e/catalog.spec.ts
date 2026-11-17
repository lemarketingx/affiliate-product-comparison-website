import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Isolated server 3104 with a large, clearly labelled TEST FIXTURE catalog.
test.use({ baseURL: "http://127.0.0.1:3104" });
const SHOTS = "outputs/qa/catalog";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><rect width="350" height="350" fill="#e9e3d5"/><text x="175" y="180" text-anchor="middle" font-size="20" fill="#14161b">TEST FIXTURE</text></svg>';
const images = (page: Page) =>
  page.route(/https:\/\/ae01\.alicdn\.com\/.*/, (route) => route.fulfill({ contentType: "image/svg+xml", body: svg }));
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.beforeAll(async ({ browser }) => {
  await mkdir(SHOTS, { recursive: true });
  // A cold catalog builds in the background by design ("הקטלוג מתעדכן ברקע"): wait until it is listed.
  const page = await browser.newPage({ baseURL: "http://127.0.0.1:3104" });
  await expect
    .poll(async () => { await page.goto("/deals"); return page.locator(".dp-product").count(); }, { timeout: 60000, intervals: [1000, 2000, 3000] })
    .toBe(24);
  await page.close();
});

test("brand-only products: no generic products, 24 per page, filters, search and pagination", async ({ page }) => {
  await images(page);
  await page.goto("/deals");
  const status = page.locator(".fp-status-line");
  await expect(status).toContainText("מוצרים בקטלוג");
  const total = Number((await status.locator("strong").innerText()).replace(/[^\d]/g, ""));
  expect(total).toBeGreaterThanOrEqual(24);
  await expect(page.locator(".dp-product")).toHaveCount(24);
  await expect(status).toContainText("מוצגים 1–24");
  // No duplicates on a page; every card is a published fixture with an affiliate link.
  // Streamed content is revealed a few ms after it arrives (Next loading boundary); role queries need it visible.
  await expect(page.locator(".dp-product").first()).toBeVisible();
  const ids = await page.locator(".dp-product").getByRole("link", { name: /^פרטי / }).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(new Set(ids).size).toBe(24);
  await expect(page.locator(".dp-product").first()).toContainText("כולל קישור שותפים");
  await expect(page.locator(".dp-product").first().getByRole("link", { name: /^לכל מוצרי המותג / })).toBeVisible();
  await expect(page.locator(".fp-shortfall")).toHaveCount(0);

  // Every card states its personal-import tax outcome (fixture rate 3.2 ₪/$).
  const taxLabels = await page.locator(".dp-product .fp-tax-label").allInnerTexts();
  expect(taxLabels).toHaveLength(24);
  expect(taxLabels.every((t) => /פטור ממסים|קרוב לתקרת הפטור|צפוי מע"מ 18%|מע"מ 18% וייתכן מכס/.test(t))).toBe(true);
  await expect(page.locator(".fp-tax-note")).toContainText("עד 75$ פטור");
  await page.getByText(/רק מוצרים פטורים ממסים/).click();
  await page.getByRole("button", { name: "סינון", exact: true }).click();
  await expect(page).toHaveURL(/tax=exempt/);
  const exemptCount = Number((await page.locator(".fp-status-line strong").innerText()).replace(/[^\d]/g, ""));
  expect(exemptCount).toBeGreaterThan(0);
  expect(exemptCount).toBeLessThan(total);
  expect((await page.locator(".dp-product .fp-tax-label").allInnerTexts()).every((t) => t.startsWith("פטור ממסים"))).toBe(true);
  const prices = (await page.locator(".dp-product-price strong").allInnerTexts()).map((t) => Number(t.replace(/[^\d.]/g, "")));
  expect(prices.every((p) => p / 3.2 <= 75 * 0.9)).toBe(true);
  await page.goto("/deals");

  // Images: thumbnail requested and rendered.
  const img = page.locator(".dp-product img").first();
  await expect(img).toHaveAttribute("src", /_350x350\.jpg$/);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

  // Pagination
  const pager = page.getByRole("navigation", { name: "עמודי קטלוג" });
  await pager.getByRole("link", { name: "הבא" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".fp-status-line")).toContainText("מוצגים 25–48");
  await expect(pager.getByRole("link", { name: "עמוד 2", exact: true })).toHaveAttribute("aria-current", "page");
  // Streamed content is revealed a few ms after it arrives (Next loading boundary); role queries need it visible.
  await expect(page.locator(".dp-product").first()).toBeVisible();
  const page2 = await page.locator(".dp-product").getByRole("link", { name: /^פרטי / }).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(page2.some((h) => ids.includes(h))).toBe(false);
  const lastPage = Math.ceil(total / 24);
  await page.goto("/deals?page=" + lastPage);
  await expect(page.locator(".dp-product")).toHaveCount(total - (lastPage - 1) * 24);
  await page.goto("/deals?page=9999");
  await expect(page.locator(".fp-status-line")).toContainText(`עמוד ${lastPage.toLocaleString("he-IL")} מתוך`);

  // Category filter + search keep real filtered counts.
  await page.goto("/deals");
  await page.getByRole("navigation", { name: "קטגוריות" }).getByRole("link", { name: "מותגים לרכב" }).click();
  await expect(page).toHaveURL(/cat=car/);
  await expect(page.locator(".fp-status-line")).toContainText("מוצרים עברו את הסינון מתוך");
  const carCount = Number((await page.locator(".fp-status-line strong").innerText()).replace(/[^\d]/g, ""));
  expect(carCount).toBeGreaterThan(0);
  expect(carCount).toBeLessThan(total);
  await page.getByRole("textbox", { name: "סינון לפי שם מוצר" }).fill("70mai");
  await page.getByRole("button", { name: "סינון", exact: true }).click();
  await expect(page).toHaveURL(/cat=car.*q=|q=.*cat=car/);
  const searched = Number((await page.locator(".fp-status-line strong").innerText()).replace(/[^\d]/g, ""));
  expect(searched).toBeLessThan(carCount);
  for (const title of await page.locator(".dp-product h3").allInnerTexts()) expect(title).toContain("70mai");
  await page.getByRole("combobox", { name: "סדר מוצרים" }).selectOption("orders");
  await expect(page).toHaveURL(/sort=orders/);
  const orders = (await page.locator(".dp-product").getByText(/מכירות מדווחות לפי הספק/).allInnerTexts()).map((t) => Number(t.replace(/[^\d]/g, "")));
  expect([...orders].sort((a, b) => b - a)).toEqual(orders);
  expect(orders.every((n) => n > 5000)).toBe(true);

  // Category page paginates too.
  await page.goto("/categories/tech?page=2");
  await expect(page.locator(".fp-status-line")).toContainText("מוצגים 25–");

  for (const [w, h, name] of [[1440, 1000, "desktop"], [375, 812, "mobile"], [304, 700, "304"]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/deals?page=3");
    expect(await noHScroll(page)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/deals-${name}.png`, fullPage: name !== "304" });
  }
});

test("catalog report: fetched, rejected (by reason) and published add up; nothing unverified shown as verified", async ({ page, request }) => {
  await page.goto("/catalog-status");
  const kpi = async (label: string) =>
    Number((await page.locator(".fp-report-kpis div", { hasText: label }).locator("dd").innerText()).replace(/[^\d]/g, ""));
  const unique = await kpi("מוצרים ייחודיים");
  const rejected = await kpi("נפסלו");
  const published = await kpi("פורסמו מוצרי מותג");
  expect(unique).toBe(rejected + published);
  expect(published).toBeGreaterThanOrEqual(24);
  expect(await kpi("שורות שהתקבלו")).toBeGreaterThan(unique);
  await expect(page.locator("table").first()).toContainText("אין קישור שותפים תקין");
  await expect(page.locator("table").first()).toContainText("מותג מוכר אינו מזוהה");
  // Owner lowered the threshold to 500 reported sales on 2026-11-17 (main 31ccce9).
  await expect(page.locator("table").first()).toContainText("פחות מ-500 מכירות מדווחות");
  await expect(page.getByText(/גודל עמוד שנוסה/)).toBeVisible();

  // Product detail: affiliate redirect works and quality stays "not verified".
  await page.goto("/deals");
  const href = await page.locator(".dp-product").first().getByRole("link", { name: /^פרטי / }).getAttribute("href");
  const id = href!.split("/").pop()!;
  await page.goto("/products/" + id);
  // Copy since 86f72ca; quality must still be shown as NOT verified.
  await expect(page.locator(".dp-selection-policy")).toContainText("איכות ומקוריות לא אומתו");
  await expect(page.locator(".dp-selection-policy")).not.toContainText("בדיקות האיכות עברו");
  await expect(page.locator("body")).not.toContainText("מאומת לפי תנאי הסינון");
  // Since 63f0b22 the buyer CTA goes through the tracked /go redirect, which resolves the affiliate link.
  await expect(page.getByRole("link", { name: /לבדיקת המוצר ב־AliExpress/ })).toHaveAttribute("href", `/go/${id}?source=catalog`);
  const go = await request.get(`/go/${id}?source=catalog`, { maxRedirects: 0 });
  expect(go.status()).toBe(307);
  expect(go.headers().location).toBe(`https://s.click.aliexpress.com/e/TEST_CATALOG_${id}`);
  // A rejected product (no affiliate link) is neither listed nor redirectable.
  const rejectedId = "1005090000001"; // pool row 1 → kind 1: no promotion link
  expect((await request.get("/go/" + rejectedId, { maxRedirects: 0 })).status()).toBe(404);
  expect(await (await request.get("/products/" + rejectedId)).text()).toContain("המוצר אינו זמין כרגע");
});

// Owner request 2026-11-17: on phones the first products must appear early,
// without dropping the disclosure (top line, one-line policy, per-card text).
for (const [w, h, priceToo] of [[320, 568, false], [375, 667, false], [390, 844, true], [412, 915, true]] as const) {
  test(`mobile catalog: first product starts in the first screen at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await images(page);
    await page.goto("/deals");
    const card = page.locator(".dp-product").first();
    await expect(card).toBeVisible();
    const media = await card.locator(".bl-card-media").boundingBox();
    expect(media && media.y).toBeLessThan(h - 40);
    if (priceToo) {
      const price = await card.locator(".dp-product-price strong").boundingBox();
      expect(price && price.y + price.height).toBeLessThanOrEqual(h);
    }
    // Disclosure is still on screen: affiliate line, policy summary, and per card.
    await expect(page.locator(".bl-topline").getByRole("link", { name: /קישורי שותפים/ })).toBeVisible();
    const policy = page.locator(".dp-selection-policy");
    await expect(policy.locator("summary")).toContainText("מקוריות המוצר טרם אומתה");
    await expect(card).toContainText("כולל קישור שותפים");
    await policy.locator("summary").click();
    await expect(policy.getByText(/דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו/)).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
  });
}

test("a failed product image shows the fallback in the same box, with the brand", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/alicdn\.com|aliexpress-media\.com/, (route) => route.abort());
  await page.goto("/deals");
  const card = page.locator(".dp-product").first();
  await expect(card.locator(".bl-img-fallback")).toBeVisible();
  await expect(card.locator(".bl-img-fallback")).toContainText("התמונה אינה זמינה כרגע");
  await expect(card.locator(".bl-card-media img")).toHaveCount(0);
  const box = await card.locator(".bl-card-media").boundingBox();
  expect(box && Math.abs(box.width - box.height)).toBeLessThan(2);
  // The brand link shows a logo or monogram plus the name; read the name from its label.
  const brand = ((await card.locator(".bl-card-brand").getAttribute("aria-label")) ?? "").replace("לכל מוצרי המותג ", "").trim();
  expect(brand.length).toBeGreaterThan(0);
  await expect(card.locator(".bl-img-fallback b")).toHaveText(brand);
  // Product page: main gallery image falls back too.
  await card.getByRole("link", { name: /^פרטי / }).click();
  await expect(page.locator(".fp-gallery-main .bl-img-fallback")).toBeVisible();
});

test("category tabs list only categories that hold listed products", async ({ page }) => {
  await images(page);
  await page.goto("/deals");
  await expect(page.locator(".dp-product").first()).toBeVisible(); // streamed content is revealed
  const cats = await page.locator(".dp-product .bl-card-cat").allInnerTexts();
  const tabs = page.getByRole("navigation", { name: "קטגוריות" }).getByRole("link");
  const labels = (await tabs.allInnerTexts()).map((t) => t.trim()).filter((t) => t !== "הכול");
  expect(labels.length).toBeGreaterThan(0);
  // Every tab leads to a category page that lists products.
  for (const label of labels) {
    await page.getByRole("navigation", { name: "קטגוריות" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(/\/deals\?cat=[a-z]+/);
    await expect(page.getByRole("navigation", { name: "קטגוריות" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".dp-product").first()).toBeVisible();
    await page.goto("/deals");
    await expect(page.locator(".dp-product").first()).toBeVisible();
  }
  expect(cats.length).toBeGreaterThan(0);
});
