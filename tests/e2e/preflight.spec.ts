import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "outputs/qa/preflight";
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const fixtureImage = (page: Page) =>
  page.route("https://ae01.alicdn.com/dealpilot-test-fixture-*.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e9e3d5"/><text x="200" y="210" text-anchor="middle" font-size="22" fill="#14161b">TEST FIXTURE</text></svg>',
    }),
  );

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
});

test("autopilot: free-text need → questions with keyboard → shareable personal plan", async ({ page }) => {
  // The homepage free-text entry was removed in the brand-first redesign (fdcf574);
  // the autopilot flow itself is unchanged and starts from its own page.
  await page.goto("/autopilot?q=" + encodeURIComponent("מצלמה סולרית לחצר בלי חשמל"));
  await expect(page.getByRole("textbox", { name: "תיאור הצורך" })).toHaveValue("מצלמה סולרית לחצר בלי חשמל");
  await page.getByRole("button", { name: "מצאו לי יעד" }).click();
  await page.getByRole("button", { name: /מצלמה אלחוטית לחצר/ }).first().click();

  // One question per screen, focus moves to the question; answer with the keyboard.
  const q1 = page.getByRole("heading", { name: /יש קליטת WiFi טובה/ });
  await expect(q1).toBeFocused();
  await page.getByRole("button", { name: "אין WiFi שם" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "כמה שמש ישירה יש בנקודה?" })).toBeFocused();
  // Term explanations open on click.
  await page.locator(".fp-ap-aside summary").first().click();
  await expect(page.locator(".fp-ap-aside .fp-term-body").first()).toBeVisible();
  await page.getByRole("button", { name: "שמש רוב היום" }).click();
  await page.getByRole("button", { name: "הקלטה כשיש תנועה" }).click();

  await expect(page.getByRole("heading", { level: 2, name: /מצלמה אלחוטית לחצר/ })).toBeVisible();
  const sim = page.locator(".fp-manifest-list li", { hasText: "כרטיס סים ישראלי" });
  await expect(sim).toHaveClass(/is-required/);
  await expect(sim).toContainText("לא בקופסה · חובה");
  await expect(page.locator(".fp-manifest-list li", { hasText: "כרטיס microSD" })).toHaveClass(/is-required/);
  await expect(page.locator(".fp-lexicon code").first()).toHaveText("solar 4G camera PIR");
  await expect(page.locator(".fp-claims").getByText("נדרש אימות").first()).toBeVisible();
  await expect(page.locator(".fp-cost-table")).toContainText("לא חושב");
  await expect(page.locator(".fp-cost")).toContainText("לא מוצג פער");
  await expect(page.getByText("לא קישורי שותפים").first()).toBeVisible();
  const wa = page.getByRole("link", { name: "שליחה בוואטסאפ" });
  const href = (await wa.getAttribute("href")) ?? "";
  expect(href.startsWith("https://wa.me/?text=")).toBe(true);
  expect(decodeURIComponent(href)).toContain("כרטיס סים ישראלי");
  expect(decodeURIComponent(href)).toContain("/autopilot?t=wireless-camera&a=");
  await expect(page).toHaveURL(/t=wireless-camera&a=network%3A4g/);

  // The plan lives only in the URL: reload restores it without any server storage.
  await page.reload();
  await expect(page.locator(".fp-manifest-list li", { hasText: "כרטיס סים ישראלי" })).toBeVisible();
  for (const [w, h, name] of [[1440, 1000, "desktop"], [375, 812, "mobile"]] as const) {
    await page.setViewportSize({ width: w, height: h });
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: `${SHOTS}/autopilot-plan-${name}.png`, fullPage: true });
  }

  // Unknown text is never forced into a destination.
  await page.goto("/autopilot?q=" + encodeURIComponent("זזזז"));
  await page.getByRole("button", { name: "מצאו לי יעד" }).click();
  await expect(page.getByText("לא זיהינו יעד מתאים")).toBeVisible();
});

test("destination page: manifest, transparent disk calculator, terms, sources and honest empty catalog", async ({ page }) => {
  await page.goto("/missions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("לא קטגוריה. צורך.");
  await page.getByRole("link", { name: /מערכת מצלמות אבטחה עם מקליט/ }).click();
  await expect(page).toHaveURL(/\/missions\/security-recorder$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("מערכת מצלמות אבטחה עם מקליט");
  await expect(page.locator(".fp-draft")).toHaveCount(0);
  const hdd = page.locator(".fp-manifest-list li", { hasText: "דיסק קשיח" });
  await expect(hdd).toHaveClass(/is-required/);
  await expect(hdd.getByRole("link")).toHaveAttribute("href", /aliexpress\.com\/w\/wholesale-surveillance-hard-drive/);
  await expect(page.getByRole("link", { name: "חפשו באליאקספרס" }).first()).toHaveAttribute(
    "href",
    "https://www.aliexpress.com/w/wholesale-8CH-PoE-NVR-H.265.html",
  );
  const calc = page.locator(".fp-calc", { hasText: "כמה דיסק צריך?" });
  await expect(calc.locator(".fp-calc-out")).toContainText("דיסק 3TB");
  await calc.getByRole("textbox", { name: "מספר מצלמות" }).fill("8");
  await expect(calc.locator(".fp-calc-out")).toContainText("דיסק 6TB");
  await calc.getByRole("textbox", { name: "מספר מצלמות" }).fill("");
  await expect(calc.locator(".fp-calc-err")).toBeVisible();
  await calc.getByRole("textbox", { name: "מספר מצלמות" }).fill("4");
  await calc.locator("summary", { hasText: "ההנחות" }).click();
  await expect(calc).toContainText("לא נתון יצרן");
  await page.locator(".fp-mission-terms summary", { hasText: "ערוצים" }).click();
  await expect(page.locator(".fp-mission-terms .fp-term-body").first()).toContainText("כמה מצלמות אפשר לחבר");
  await expect(page.getByRole("heading", { name: "מתי עדיף לקנות בישראל" })).toBeVisible();
  await expect(page.getByText("אין כרגע בקטלוג מוצרים שזוהו ליעד הזה")).toBeVisible();
  for (const [w, h, name] of [[1440, 1000, "desktop"], [375, 812, "mobile"]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: `${SHOTS}/mission-${name}.png`, fullPage: true });
  }
  await page.goto("/guides/shipping-customs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("משלוח");
  await expect(page.getByText("נדרש אימות").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /רשות המסים בישראל: מחשבון מסי יבוא אישי/ }).first()).toBeVisible();
  await expect(page.locator("body")).toContainText("ביבוא אישי עד 75$ אין מע\"מ");
});

for (const width of [304, 375, 768, 1440]) {
  test(`pre-flight pages have no horizontal scroll at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/missions", "/missions/security-recorder", "/missions/wireless-camera", "/autopilot", "/autopilot?t=security-recorder&a=cams%3A5-8", "/guides", "/guides/plugs-power"]) {
      await page.goto(path);
      expect(await noHorizontalScroll(page), path).toBe(true);
    }
  });
}

test.describe("typed catalog products (isolated fixture server)", () => {
  test.use({ baseURL: "http://127.0.0.1:3103" });
  test("product page shows 'probably not in the box', Israel fit and a landed cost that never invents a gap", async ({ page, request }) => {
    await fixtureImage(page);
    await page.goto("/products/1005005550001");
    const brief = page.locator(".fp-pbrief");
    await expect(brief.getByRole("heading", { name: "מה כנראה לא בקופסה" })).toBeVisible();
    await expect(brief).toContainText("זיהינו את המוצר כ\"מצלמת דרך לרכב\"");
    await expect(brief).toContainText("High Endurance");
    await expect(brief).toContainText("בדרך כלל לא כלול · חובה");
    await expect(brief).toContainText("בדקו בתיאור המוכר");
    const cost = brief.locator(".fp-cost");
    await expect(cost.getByRole("textbox", { name: "מחיר באליאקספרס (₪)" })).toHaveValue("149.9");
    await cost.getByRole("textbox", { name: /משלוח לישראל/ }).fill("0");
    await cost.getByRole("textbox", { name: /כרטיס microSD/ }).fill("40");
    await cost.getByRole("textbox", { name: "המחיר שראיתם בישראל (₪)" }).fill("450");
    // Verified tax rules + (fixture) representative rate: 149.9 ₪ ≈ 47$ → exempt, so the gap is computed.
    await expect(cost.locator(".fp-cost-table tr", { hasText: "מע\"מ ביבוא אישי" })).toContainText("עד התקרה של 75$: פטור");
    await expect(cost).toContainText("פער משוער");
    await expect(cost).toContainText("זו הערכה ולא חיסכון מובטח");
    await expect(page.locator(".fp-tax-box")).toContainText("פטור ממסים (עד 75$)");
    await expect(page.getByText("קישור שותפים: ייתכן שנקבל עמלה")).toBeVisible();
    const go = await request.get("/go/1005005550001", { maxRedirects: 0 });
    expect(go.status()).toBe(307);
    for (const [w, h, name] of [[1440, 1000, "desktop"], [375, 812, "mobile"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      expect(await noHorizontalScroll(page)).toBe(true);
      await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: `${SHOTS}/product-${name}.png`, fullPage: true });
    }
    await page.goto("/missions/dashcam");
    await expect(page.locator(".dp-product")).toHaveCount(1);
    await expect(page.locator(".dp-product")).toContainText("מצלמת דרך");
    await expect(page.getByRole("link", { name: "גילוי נאות" })).toBeVisible();
  });
});
