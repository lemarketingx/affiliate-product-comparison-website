import { test, expect } from "@playwright/test";

// The isolated catalog fixture supplies brand-eligible products, not live sales.
test.use({ baseURL: "http://127.0.0.1:3104" });

test("premium brand home: carousel buttons switch slides; brands and curated cards are navigable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dpb-campaign")).toBeVisible();
  await expect(page.locator(".dpb-logo-tile").first()).toBeVisible();
  await expect(page.locator(".dp-product").first()).toBeVisible();
  await expect(page.locator(".dpb-category").first()).toBeVisible();
  const before = await page.locator(".dpb-campaign-copy h2").innerText();
  await page.getByRole("button", { name: "לבאנר הבא" }).click();
  const after = await page.locator(".dpb-campaign-copy h2").innerText();
  expect(after).not.toBe(before);
  await page.getByRole("button", { name: "עצירת החלפה אוטומטית" }).click();
  await expect(page.getByRole("button", { name: "הפעלת החלפה אוטומטית" })).toBeVisible();
  // Every card, not one: no invented discount percentage anywhere.
  for (const text of await page.locator(".dp-product").allInnerTexts()) expect(text).not.toMatch(/-[1-9]\d*%/);
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

// Owner request 2026-11-18: a moving strip of real brand logos and provider best sellers.
test("moving strip: listed brands and best sellers, one focusable link each, pausable, still under reduced motion", async ({ page }) => {
  await page.goto("/");
  const strip = page.getByRole("region", { name: /מותגים ומוצרים נמכרים בקטלוג/ });
  await expect(strip).toBeVisible();
  // Only brands with listed products; every brand link goes to a brand page.
  const brandLinks = strip.locator('[data-row="brands"] .bl-marquee-track:not([aria-hidden]) li:not([aria-hidden]) a');
  expect(await brandLinks.count()).toBeGreaterThanOrEqual(4);
  for (const href of await brandLinks.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).toMatch(/^\/brands\/[a-z0-9]+$/);
  // Best sellers are labelled as the provider's reported sales, never as a rating.
  const seller = strip.locator('[data-row="sellers"] .bl-marquee-track:not([aria-hidden]) li:not([aria-hidden]) a').first();
  await expect(seller).toHaveAttribute("aria-label", /מכירות מדווחות לפי הספק$/);
  await expect(seller).toHaveAttribute("href", /^\/products\/\d+$/);
  // Copies that close the loop are hidden and not focusable.
  for (const t of await strip.locator('a[tabindex="-1"]').evaluateAll((as) => as.map((a) => a.closest('[aria-hidden="true"]') !== null))) expect(t).toBe(true);
  // It moves, and the pause button stops it (WCAG 2.2.2).
  const belt = strip.locator(".bl-marquee-belt").first();
  await expect(belt).toHaveCSS("animation-name", "bl-marquee");
  await expect(belt).toHaveCSS("animation-play-state", "running");
  await page.mouse.move(0, 0);
  await strip.getByRole("button", { name: "עצירת התנועה" }).click();
  await page.mouse.move(0, 0);
  await expect(belt).toHaveCSS("animation-play-state", "paused");
  await expect(strip.getByRole("button", { name: "הפעלת התנועה" })).toHaveAttribute("aria-pressed", "true");
});

test("moving strip and Ken Burns stop under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3104", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".bl-marquee")).toBeVisible();
  await expect(page.locator(".bl-marquee-belt").first()).toHaveCSS("animation-name", "none");
  await expect(page.locator(".bl-marquee-pause")).toBeHidden();
  const img = page.locator(".dpb-stage-item img").first();
  if (await img.count()) await expect(img).toHaveCSS("animation-name", "none");
  await context.close();
});
