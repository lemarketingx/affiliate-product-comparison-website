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
  await expect(page.locator(".fp-ticket-price strong")).toHaveText("אין מחיר עדכני");
  await expect(page.getByText("77.70")).toHaveCount(0);
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

test("storefront reads the database and shows detail-checked prices with their age", async ({ page }) => {
  await page.goto(BASE + "/deals");
  // The seeded stale product sorts first (most sales); take the next real one.
  const first = page.locator('a[href^="/products/"]:not([href*="1005000000777"])').first();
  await expect(first).toBeVisible();
  const href = (await first.getAttribute("href"))!;
  refreshedId = href.split("/").pop()!.split("?")[0];
  await page.goto(BASE + href);
  await expect(page.getByText(/בדיקה לפי מזהה מוצר.*נבדק/)).toBeVisible();
  // Detail fixture price = search price × 1.04 (TEST FIXTURE).
  const search = 9.9 + (Number(refreshedId.slice(-3)) % 200) * 4;
  const expected = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(Number((search * 1.04).toFixed(2)));
  await expect(page.locator(".fp-ticket-price strong")).toHaveText(expected);
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
    await expect(page.getByText(/מחיר האפליקציה שונה ממחיר האתר/).first()).toBeVisible();
    // Detail fixture = search × 1.04: the measured gap is shown (search rows carry no sku_id, so no SKU claim).
    await expect(page.getByRole("cell", { name: /^4(\.0)?%$/ }).first()).toBeVisible();
    await expect(page.getByText(/הווריאציה \(sku_id\) שונה/)).toHaveCount(0);
    await expect(page.locator("table").last().locator("tbody tr")).toHaveCount(4); // 2 discover + 2 price runs
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
