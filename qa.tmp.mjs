import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const base = "http://127.0.0.1:3104";
// TEST image: a product-like square photo stand-in (real CDN is blocked in this sandbox).
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#fff"/><rect x="170" y="150" width="260" height="300" rx="36" fill="#2b2f36"/><rect x="200" y="190" width="200" height="140" rx="14" fill="#5b6470"/><circle cx="300" cy="390" r="28" fill="#ffd43b"/></svg>';
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const route = (ctx) => ctx.route(/alicdn\.com|aliexpress-media\.com/, (r) => r.fulfill({ contentType: "image/svg+xml", body: svg }));
const c0 = await b.newContext(); await route(c0); const p0 = await c0.newPage();
for (let i = 0; i < 25; i++) { await p0.goto(base + "/deals"); if (await p0.locator(".dp-product").count()) break; await p0.waitForTimeout(1500); }
const product = await p0.locator(".dp-product").first().getByRole("link", { name: /^פרטי / }).getAttribute("href");
await c0.close();
const pages = { home: "/", deals: "/deals", search: "/search?q=Baseus", category: "/categories/tech", categories: "/categories", brands: "/brands", product, notfound: "/no-such-page" };
const rows = [], axeRows = [];
for (const w of [320, 375, 390, 768, 1024, 1440, 1920]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await route(ctx);
  const p = await ctx.newPage();
  for (const [name, path] of Object.entries(pages)) {
    const res = await p.goto(base + path, { waitUntil: "networkidle" });
    const m = await p.evaluate(() => {
      const imgs = [...document.querySelectorAll("main img")].filter((i) => i.getBoundingClientRect().width > 0);
      const prices = [...document.querySelectorAll(".dp-product-price strong, .bl-receipt-price strong")];
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        h1: document.querySelectorAll("h1").length,
        imgsVisible: imgs.length,
        imgsBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
        minPricePx: prices.length ? Math.min(...prices.map((e) => parseFloat(getComputedStyle(e).fontSize))) : null,
      };
    });
    rows.push({ w, page: name, status: res.status(), ...m });
    if ([390, 1440].includes(w)) {
      await p.screenshot({ path: `/tmp/claude-0/shots/p2-${name}-${w}.png`, fullPage: name !== "home" || w === 1440 ? false : false });
      if (name === "home") await p.screenshot({ path: `/tmp/claude-0/shots/p2-home-full-${w}.png`, fullPage: true });
      await p.addScriptTag({ content: axe });
      const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })));
      for (const v of r) axeRows.push({ w, page: name, ...v });
    }
  }
  await ctx.close();
}
console.table(rows.filter((r) => r.overflow > 0 || r.h1 !== 1 || r.imgsBroken > 0 || (r.minPricePx !== null && r.minPricePx < 16)));
console.log("rows checked:", rows.length, "| pages:", Object.keys(pages).join(","));
console.log("price font px (min over all):", Math.min(...rows.filter((r) => r.minPricePx).map((r) => r.minPricePx)));
console.log("visible images on deals@390:", rows.find((r) => r.w === 390 && r.page === "deals").imgsVisible);
console.table(axeRows);
await b.close();
