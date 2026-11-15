import { test, expect } from "@playwright/test";

test("without API the brand-first homepage never markets generic fallback products", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fp-brand-hero")).toBeVisible();
  await expect(page.locator(".fp-banners")).toHaveCount(0);
  await expect(page.locator(".fp-product-promos")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /המותגים שאתם מכירים/ })).toBeVisible();
  await page.goto("/brands");
  await expect(page.getByRole("heading", { name: /מכירים את המותג/ })).toBeVisible();
});

test.describe("isolated Affiliate API fixture on 3104", () => {
  test.use({ baseURL: "http://127.0.0.1:3104" });
  test("the public storefront lists only corroborated brand items, not generic campaign links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".fp-brand-hero")).toBeVisible();
    await expect(page.locator(".fp-banners")).toHaveCount(0);
    await page.goto("/brands");
    await expect(page.locator(".fp-brand-card").first()).toBeVisible();
    await page.locator(".fp-brand-card").first().click();
    await expect(page.locator(".dp-product").first()).toBeVisible();
    await expect(page.locator(".dp-product").first().locator(".fp-product-brand-tag")).toBeVisible();
  });
});
