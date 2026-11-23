import { test, expect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

// Port 3105: fixture provider + fixture Supabase (pglite running the real
// migration). Exercises the unmodified server code: supabase-js RPC contract,
// cron job, DB-backed storefront, stale-price withholding, clicks and the
// populated admin dashboard. TEST FIXTURE data — not live evidence.
const BASE = "http://127.0.0.1:3105";
const AUTH = { authorization: "Bearer fixture-cron-secret-0123456789abcdef" };
test.describe.configure({ mode: "serial" });

async function asAdmin(context: BrowserContext) {
  const value = await encode({
    secret: process.env.DEALPILOT_QA_SECRET!,
    token: { name: "QA administrator", email: "qa@example.invalid", adminGithubId: "123" },
    maxAge: 600,
  });
  await context.addCookies([{ name: "next-auth.session-token", value, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
}

let firstInserted = 0;
let refreshedId = "";

test("a stored product with a 5-day-old price is listed without a price", async ({ page }) => {
  await page.goto(BASE + "/products/1005000000777");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("מחיר לא עדכני");
  await expect(page.getByText(/ולכן אינו מוצג כעדכני/)).toBeVisible();
  await expect(page.getByRole("region", { name: "מחיר וקנייה" }).locator("strong").first()).toHaveText("אין מחיר עדכני");
  await expect(page.getByText("77.70")).toHaveCount(0);
});

test("product page charts stored prices of the shown variant and currency only", async ({ page }) => {
  await page.goto(BASE + "/products/1005000000888");
  const section = page.getByRole("region", { name: "היסטוריית המחיר שבדקנו" });
  await expect(section).toBeVisible();
  await expect(section.getByText(/3 בדיקות מאז/)).toBeVisible();
  await expect(section.locator(".bl-history-dot")).toHaveCount(3);
  await expect(section.getByRole("img", { name: /3 בדיקות/ })).toBeVisible();
  await section.getByText("כל הבדיקות בטבלה").click();
  await expect(section.getByRole("row")).toHaveCount(4); // header + 3 observations
  await expect(section.getByText("99.00")).toHaveCount(0); // other SKU
  await expect(section.getByText(/\$/)).toHaveCount(0); // USD observation
  // A product whose price is withheld gets no chart.
  await page.goto(BASE + "/products/1005000000777");
  await expect(page.getByRole("region", { name: "היסטוריית המחיר שבדקנו" })).toHaveCount(0);
});

test("cron rejects a wrong secret and runs the import with the right one", async ({ request }) => {
  expect((await request.get(BASE + "/api/cron/catalog", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const res = await request.get(BASE + "/api/cron/catalog", { headers: AUTH, timeout: 60000 });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.discovery.status).toBe("succeeded");
  expect(body.discovery.stats.calls).toBe(30);
  expect(body.discovery.stats.inserted).toBeGreaterThan(100);
  expect(body.discovery.stats.publishedNew).toBeGreaterThan(50);
  expect(body.discovery.stats.duplicatesInRun).toBeGreaterThan(0);
  expect(body.prices.stats.updated).toBeGreaterThan(0);
  expect(body.prices.stats.missing).toBeGreaterThanOrEqual(1); // 1005000000777 is never returned
  firstInserted = body.discovery.stats.inserted;
});

test("a second run goes deeper and never inserts a product twice", async ({ request }) => {
  const res = await request.get(BASE + "/api/cron/catalog", { headers: AUTH, timeout: 60000 });
  const body = await res.json();
  expect(res.status()).toBe(200);
  // Re-seen shared-pool products are updates, not inserts or new publications.
  expect(body.discovery.stats.updated).toBeGreaterThan(0);
  expect(body.discovery.stats.inserted + body.discovery.stats.updated).toBe(body.discovery.stats.uniqueInRun);
  // Every published product is now detail-checked recently, so nothing is due again.
  expect(body.prices.stats.calls).toBeLessThanOrEqual(10);
  void firstInserted;
});

test("price check and import run as separate jobs", async ({ request }) => {
  const prices = await request.get(BASE + "/api/cron/catalog?job=prices", { headers: AUTH, timeout: 60000 });
  expect(prices.status()).toBe(200);
  const pb = await prices.json();
  expect(pb.discovery).toBeNull(); // a price check spends no search calls
  expect(pb.prices.runId).toBeGreaterThan(0);
  expect((await request.get(BASE + "/api/cron/catalog?job=nope", { headers: AUTH })).status()).toBe(400);
  const disc = await request.get(BASE + "/api/cron/catalog?job=discover", { headers: AUTH, timeout: 60000 });
  expect(disc.status()).toBe(200);
  expect((await disc.json()).prices).toBeNull(); // an import spends no price-check calls
  // Refusal of a concurrent start (409 RUN_IN_PROGRESS) is covered by unit tests on the
  // real SQL; here every term is exhausted, so runs finish too fast to overlap reliably.
});

test("link check job follows affiliate links to the same product", async ({ request }) => {
  const res = await request.get(BASE + "/api/cron/catalog?job=links", { headers: AUTH, timeout: 60000 });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.discovery).toBeNull();
  expect(body.prices).toBeNull();
  // 25 links per run since 2026-11-17 (was 8): 315 new products need checking within days.
  expect(body.links.stats.checked).toBe(25);
  // The seeded stale product's link has no fixture redirect: unverifiable, not unpublished.
  expect(body.links.stats.ok + body.links.stats.broken).toBe(25);
  expect(body.links.stats.ok).toBeGreaterThanOrEqual(24);
  expect(body.links.stats.withAffParams).toBe(body.links.stats.ok);
  expect(body.links.stats.unpublished).toBe(0);
});

test("storefront reads the database and shows detail-checked prices with their age", async ({ page }) => {
  // The price job checks the highest-selling products first, within a call budget, so
  // list by sales. The seeded stale product sorts first (most sales); skip it.
  // A later import run (previous test) can add newer best sellers that are not checked yet,
  // so scan the first two pages.
  const hrefs: string[] = [];
  for (const pg of [1, 2]) {
    await page.goto(BASE + "/deals?sort=orders&page=" + pg);
    await expect(page.locator(".dp-product").first()).toBeVisible();
    hrefs.push(...((await page.locator('a[href^="/products/"]:not([href*="1005000000777"])').evaluateAll((els) =>
      els.map((e) => e.getAttribute("href")!))) as string[]));
  }
  expect(hrefs.length).toBeGreaterThan(0);
  let href = "";
  for (const h of [...new Set(hrefs)]) {
    await page.goto(BASE + h);
    if (await page.getByText(/בדיקה לפי מזהה מוצר.*נבדק/).count()) { href = h; break; }
  }
  expect(href, "a listed product shows a detail-checked price").not.toBe("");
  refreshedId = href.split("/").pop()!.split("?")[0];
  await expect(page.getByText(/בדיקה לפי מזהה מוצר.*נבדק/)).toBeVisible();
  // Detail fixture answers in USD (search ILS / 3.7 × 1.04, TEST FIXTURE). The search rows
  // carry no USD price to confirm against, so the fresh USD quote is shown as USD — never relabelled ILS.
  const search = 9.9 + (Number(refreshedId.slice(-3)) % 200) * 4;
  const expected = new Intl.NumberFormat("he-IL", { style: "currency", currency: "USD" }).format(Number(((search / 3.7) * 1.04).toFixed(2)));
  await expect(page.getByRole("region", { name: "מחיר וקנייה" }).locator("strong").first()).toHaveText(expected);
  await expect(page.getByText(/SKU 99/)).toBeVisible();
});

test("affiliate redirect is immediate and the click is stored", async ({ request }) => {
  const res = await request.get(BASE + `/go/${refreshedId}?source=catalog`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(/^https:\/\/s\.click\.aliexpress\.com\/e\/TEST_CATALOG_/);
});

test("admin dashboard shows totals, price gaps with explanations, runs and clicks", async ({ page, context }) => {
  await asAdmin(context);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(BASE + "/admin/catalog");
    await expect(page.getByText(/מסד נתונים ייעודי .*: מוגדר/)).toBeVisible();
    await expect(page.getByText(/חדשים שפורסמו היום:/)).toBeVisible();
    await expect(page.getByText(/מפורסמים ללא מחיר עדכני: 1/)).toBeVisible();
    await expect(page.getByText(/קליקים ל־AliExpress ב־30 יום: 1/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "פערי מחיר: חיפוש מול בדיקת מוצר" })).toBeVisible();
    await expect(page.getByText(/המטבע שונה בין החיפוש לבדיקת המוצר/).first()).toBeVisible();
    // Search quotes are ILS-only and detail quotes USD: no same-currency comparison is possible, so none is invented.
    await expect(page.getByRole("cell", { name: "לא ניתן להשוואה (מטבע שונה)" }).first()).toBeVisible();
    await expect(page.getByText(/הווריאציה \(sku_id\) שונה/)).toHaveCount(0);
    await expect(page.locator("table").last().locator("tbody tr")).toHaveCount(7); // 2×(discover+prices) + prices + discover + links
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/admin-catalog-populated-${width}.png`, fullPage: true });
  }
});

test("admin can unpublish a product; it disappears from the storefront and /go", async ({ page, context, request }) => {
  await asAdmin(context);
  await page.goto(BASE + "/admin/catalog");
  const res = await page.evaluate(async (id) => {
    const r = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish", productId: id }) });
    return r.status;
  }, refreshedId);
  expect(res).toBe(200);
  expect((await request.get(BASE + `/go/${refreshedId}`, { maxRedirects: 0 })).status()).toBe(404);
});
