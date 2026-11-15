import { test, expect } from "@playwright/test";

// The isolated catalog fixture supplies brand-eligible products, not live sales.
test.use({ baseURL: "http://127.0.0.1:3104" });

test("premium brand home: carousel buttons switch slides; brands and curated cards are navigable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dpb-campaign")).toBeVisible();
  await expect(page.locator(".dpb-logo-tile").first()).toBeVisible();
  await expect(page.locator(".dpb-product").first()).toBeVisible();
  await expect(page.locator(".dpb-category").first()).toBeVisible();
  const before = await page.locator(".dpb-campaign-copy h2").innerText();
  await page.getByRole("button", { name: "לבאנר הבא" }).click();
  const after = await page.locator(".dpb-campaign-copy h2").innerText();
  expect(after).not.toBe(before);
  await page.getByRole("button", { name: "עצירת החלפה אוטומטית" }).click();
  await expect(page.getByRole("button", { name: "הפעלת החלפה אוטומטית" })).toBeVisible();
  await expect(page.locator(".dpb-product")).not.toContainText(/-[1-9]\d*%/);
});

test("premium brand home: no horizontal overflow on mobile", async ({ page }) => {
  for (const width of [375, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await expect(page.locator(".dpb-campaign")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, "horizontal overflow at " + width).toBe(false);
  }
});
