import test from "node:test";
import assert from "node:assert/strict";
import { estimateStorage } from "../lib/preflight/storage-calc.ts";
import { estimateCharges } from "../lib/preflight/powerbank-calc.ts";
import { landedCost } from "../lib/preflight/landed-cost.ts";
import { IMPORT_TAX } from "../lib/preflight/import-tax.ts";
import { PRODUCT_TYPES } from "../lib/preflight/product-types.ts";
import { TRAITS } from "../lib/preflight/traits.ts";
import { GLOSSARY } from "../lib/preflight/glossary.ts";
import { GUIDES } from "../lib/preflight/guides.ts";
import { matchNeed } from "../lib/preflight/match.ts";
import { detectType } from "../lib/preflight/detect.ts";
import { buildPlan, questionsFor, encodeAnswers, decodeAnswers } from "../lib/preflight/plan.ts";
import { aliSearchUrl } from "../lib/preflight/search.ts";
import { visibility, draftsEnabled } from "../lib/preflight/approvals.ts";
import { visibleTypes } from "../lib/preflight/index.ts";
import { pricesFor, validIsraelPrice, ISRAEL_PRICES } from "../lib/preflight/israel-prices.ts";

const base = { cameras: 4, resolution: "4MP", codec: "h265", hoursPerDay: 24, days: 14, media: "hdd" };

test("storage: transparent formula, H.265 halves H.264, recommends next disk size", () => {
  const r265 = estimateStorage(base);
  const r264 = estimateStorage({ ...base, codec: "h264" });
  assert.equal(r265.ok, true);
  // 4 cams × 3 Mbps × 86400 s × 14 d / 8 / 1000 = 1814.4 GB
  assert.equal(r265.gb, 1814.4);
  assert.equal(r264.gb, 3628.8);
  assert.equal(r265.recommended, "דיסק 3TB"); // 1814.4 × 1.15 = 2086.6 → 3TB
  assert.ok(r265.assumptions.some((a) => a.includes("הנחה")));
});
test("storage: custom bitrate overrides assumption; SD media recommends a card", () => {
  const r = estimateStorage({ cameras: 1, resolution: "2MP", codec: "h264", hoursPerDay: 2, days: 7, bitrateMbps: 8, media: "sd" });
  assert.equal(r.ok, true);
  assert.equal(r.bitrateMbps, 8);
  assert.equal(r.gb, 50.4);
  assert.equal(r.recommended, "כרטיס 64GB");
  assert.ok(r.assumptions[0].includes("שהזנתם"));
});
test("storage: edge cases and missing data never produce a number", () => {
  for (const bad of [
    { cameras: 0 }, { cameras: NaN }, { cameras: 2.5 }, { cameras: -1 },
    { hoursPerDay: 0 }, { hoursPerDay: 25 }, { days: 0 }, { days: NaN }, { days: 1.5 },
    { bitrateMbps: -3 }, { bitrateMbps: 500 }, { resolution: "16MP" },
  ]) {
    const r = estimateStorage({ ...base, ...bad });
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.ok(r.error.length > 0);
  }
  const huge = estimateStorage({ ...base, cameras: 64, codec: "h264", resolution: "8MP", days: 365 });
  assert.equal(huge.ok, true);
  assert.match(huge.recommended, /20TB/);
});
test("powerbank: real charges below naive ratio; >100Wh flagged; invalid input refused", () => {
  const r = estimateCharges({ bankMah: 10000, phoneMah: 4500 });
  assert.equal(r.ok, true);
  assert.equal(r.bankWh, 37);
  assert.ok(r.charges < 10000 / 4500);
  assert.equal(r.charges, 1.3);
  assert.equal(estimateCharges({ bankMah: 30000, phoneMah: 4000 }).over100Wh, true);
  assert.equal(estimateCharges({ bankMah: 0, phoneMah: 4000 }).ok, false);
  assert.equal(estimateCharges({ bankMah: 10000, phoneMah: NaN }).ok, false);
  assert.equal(estimateCharges({ bankMah: 10000, phoneMah: 4000, efficiency: 1.5 }).ok, false);
});

const verifiedTax = IMPORT_TAX;
const unverifiedTax = { ...IMPORT_TAX, verified: false, exemptionUsd: null, vatRate: null, sources: [], unverifiedReason: "לא אומת" };
const input = (over = {}) => ({
  itemPriceILS: 200, itemFromApi: true, shippingILS: 20, accessories: [], usdIlsRate: 3.7,
  israelPrice: { priceILS: 600, origin: "owner", label: "חנות" }, ...over,
});

test("tax config: verified from official sources with check dates (Tax Authority calculator, Knesset research)", () => {
  assert.equal(IMPORT_TAX.verified, true);
  assert.equal(IMPORT_TAX.exemptionUsd, 75);
  assert.equal(IMPORT_TAX.vatRate, 0.18);
  assert.equal(IMPORT_TAX.customsFreeUpToUsd, 500);
  assert.equal(IMPORT_TAX.thresholdIncludesShipping, false);
  assert.equal(IMPORT_TAX.vatBaseIncludesShipping, true);
  assert.ok(IMPORT_TAX.sources.length >= 2);
  for (const s of IMPORT_TAX.sources) {
    assert.match(s.url, /^https:\/\/[^/]*\.gov\.il\//);
    assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
test("landed cost: an unverified config never computes tax and shows no gap", () => {
  const r = landedCost(input(), unverifiedTax);
  const tax = r.lines.find((l) => l.id === "tax");
  assert.equal(tax.state, "not_computed");
  assert.equal(tax.amount, null);
  assert.equal(r.complete, false);
  assert.equal(r.gap, null);
  assert.match(r.gapReason, /לא מוצג פער/);
});
test("landed cost: verified config computes VAT above threshold on item + shipping", () => {
  const r = landedCost(input({ itemPriceILS: 400, shippingILS: 30 }), verifiedTax); // 400/3.7 ≈ 108$ > 75
  const tax = r.lines.find((l) => l.id === "tax");
  assert.equal(tax.amount, 77.4); // 18% of 430 (VAT base includes shipping)
  assert.equal(r.subtotal, 507.4);
  assert.equal(r.complete, true);
  assert.equal(r.gap, 92.6);
});
test("landed cost: the exemption test ignores shipping (goods value only)", () => {
  // goods 270 ILS / 3.7 = 73$ (exempt) even though goods + shipping = 82$
  const r = landedCost(input({ itemPriceILS: 270, shippingILS: 35 }), verifiedTax);
  assert.equal(r.lines.find((l) => l.id === "tax").amount, 0);
});
test("landed cost: under threshold is zero tax with a check-at-checkout note", () => {
  const r = landedCost(input(), verifiedTax); // 220/3.7 ≈ 59$
  const tax = r.lines.find((l) => l.id === "tax");
  assert.equal(tax.amount, 0);
  assert.match(tax.note, /פטור/);
  assert.match(tax.note, /72 שעות/);
  assert.equal(r.gap, 380);
});
test("landed cost: missing shipping, accessory, rate or Israel price blocks the gap", () => {
  let r = landedCost(input({ shippingILS: null }), verifiedTax);
  assert.equal(r.gap, null);
  assert.ok(r.missing.includes("משלוח"));
  r = landedCost(input({ accessories: [{ label: "דיסק קשיח", priceILS: null }] }), verifiedTax);
  assert.equal(r.gap, null);
  assert.ok(r.missing.includes("דיסק קשיח"));
  r = landedCost(input({ usdIlsRate: null }), verifiedTax);
  assert.equal(r.lines.find((l) => l.id === "tax").state, "not_computed");
  assert.equal(r.gap, null);
  r = landedCost(input({ israelPrice: null }), verifiedTax);
  assert.equal(r.complete, true);
  assert.equal(r.gap, null);
  r = landedCost(input({ itemPriceILS: -5 }), verifiedTax);
  assert.equal(r.lines[0].state, "not_computed");
  r = landedCost(input({ accessories: [{ label: "דיסק", priceILS: 0 }] }), verifiedTax);
  assert.equal(r.complete, true);
});
test("landed cost: above customs threshold is product-specific and not computed", () => {
  const r = landedCost(input({ itemPriceILS: 2500 }), verifiedTax);
  assert.equal(r.lines.find((l) => l.id === "tax").state, "not_computed");
  assert.equal(r.gap, null);
});
test("landed cost: negative gap is reported honestly (more expensive abroad)", () => {
  const r = landedCost(input({ israelPrice: { priceILS: 150, origin: "visitor", label: "x" } }), verifiedTax);
  assert.equal(r.gap, -70);
});

test("content integrity: every claim has a source, is general, or is marked for verification", () => {
  const claims = [
    ...PRODUCT_TYPES.flatMap((t) => [...t.rules, ...(t.israel ?? [])]),
    ...Object.values(TRAITS).flatMap((t) => [...t.israel, ...t.buyLocal]),
    ...GUIDES.flatMap((g) => g.sections.flatMap((s) => s.claims)),
  ];
  assert.ok(claims.length > 40);
  for (const c of claims) {
    const ok = (c.source && /^https:\/\//.test(c.source.url) && /^\d{4}-\d{2}-\d{2}$/.test(c.source.checkedAt)) || c.general || c.needsVerification;
    assert.ok(ok, c.text);
    // Tax rates, thresholds or prices may never appear as unsourced general knowledge.
    if (c.general) assert.doesNotMatch(c.text, /\d+\s*(\$|₪|דולר|ש"ח|%)/, c.text);
  }
});
test("content integrity: effects, terms and traits reference existing ids", () => {
  for (const type of PRODUCT_TYPES) {
    for (const tr of type.traits) assert.ok(TRAITS[tr], type.id + " trait " + tr);
    const allItems = new Set([...type.manifest, ...Object.values(TRAITS).flatMap((t) => t.manifest)].map((i) => i.id));
    const qs = [...type.questions, ...Object.values(TRAITS).flatMap((t) => t.questions ?? [])];
    for (const q of qs) {
      assert.ok(q.options.length >= 2, q.id);
      for (const t of q.terms ?? []) assert.ok(GLOSSARY[t], "term " + t);
      for (const o of q.options) {
        const e = o.effect ?? {};
        for (const id of [...(e.have ?? []), ...(e.hide ?? []), ...(e.require ?? [])]) assert.ok(allItems.has(id), `${type.id}/${q.id}: ${id}`);
        for (const tr of e.addTraits ?? []) assert.ok(TRAITS[tr], tr);
        for (const s of e.search ?? []) assert.ok(type.search.some((x) => x.en === s) || !type.questions.includes(q), `${type.id}: search ${s}`);
      }
    }
    for (const i of type.manifest) for (const t of i.terms ?? []) assert.ok(GLOSSARY[t], "term " + t);
    assert.match(type.code, /^[A-Z]{3}-\d{2}$/);
    assert.ok(type.search.length >= 1 && type.pageChecks.length + type.traits.length > 0, type.id);
  }
  assert.equal(new Set(PRODUCT_TYPES.map((t) => t.id)).size, PRODUCT_TYPES.length);
  assert.equal(new Set(PRODUCT_TYPES.map((t) => t.code)).size, PRODUCT_TYPES.length);
});

test("free-text need matching: Hebrew phrasing, prefixes and synonyms", () => {
  const top = (q) => matchNeed(q, PRODUCT_TYPES)[0]?.type.id;
  assert.equal(top("אני רוצה מצלמות אבטחה לבית"), "security-recorder");
  assert.equal(top("מצלמה סולרית לחצר בלי חשמל"), "wireless-camera");
  assert.equal(top("מטען מהיר לאייפון"), "charger");
  assert.equal(top("מצלמת דרך לאוטו"), "dashcam");
  assert.equal(top("קסדה לקורקינט של הילד"), "safety-gear");
  assert.equal(top("שקע חכם"), "smart-home");
  assert.deepEqual(matchNeed("", PRODUCT_TYPES), []);
  assert.deepEqual(matchNeed("זזזזז", PRODUCT_TYPES), []);
});
test("title detection is conservative: exclusions win and organizers are not chargers", () => {
  const d = (t) => detectType(t, PRODUCT_TYPES)?.type.id ?? null;
  assert.equal(d("TEST FIXTURE — מארגן כבלים לבדיקה בלבד"), null);
  assert.equal(d("8CH 4K PoE NVR Kit H.265 Outdoor IP Camera"), "security-recorder");
  assert.equal(d("מצלמה סולארית 4G חיצונית עם PIR"), "wireless-camera");
  assert.equal(d("Dash Cam Front and Rear 4K WiFi"), "dashcam");
  assert.equal(d("65W GaN Charger USB C PD Fast Charging"), "charger");
  assert.equal(d("20000mAh Power Bank PD 20W"), "powerbank");
  assert.equal(d("Silicone case for AirPods earbuds"), null);
  assert.equal(d("Kitchen knife set"), null);
  assert.deepEqual(detectType("Dash Cam Front", PRODUCT_TYPES).matched, ["dash cam"]);
});

test("plan: answers tailor the manifest, add traits and keep 'not in box' required", () => {
  const nvr = PRODUCT_TYPES.find((t) => t.id === "security-recorder");
  const p0 = buildPlan(nvr);
  const hdd = p0.items.find((i) => i.id === "hdd");
  assert.equal(hdd.status, "required");
  assert.equal(p0.items[0].status, "required"); // required items first
  assert.ok(p0.calculators.includes("storage"));
  const p1 = buildPlan(nvr, { "storage-have": "yes", wiring: "lan" });
  assert.equal(p1.items.find((i) => i.id === "hdd").have, true);
  assert.equal(p1.items.find((i) => i.id === "cables").have, true);
  const solar = PRODUCT_TYPES.find((t) => t.id === "wireless-camera");
  const wifi = buildPlan(solar, { network: "wifi" });
  const g4 = buildPlan(solar, { network: "4g" });
  assert.ok(!wifi.items.some((i) => i.id === "sim"));
  assert.ok(g4.items.find((i) => i.id === "sim").status === "required");
  assert.ok(g4.israel.some((c) => c.text.includes("LTE")));
  assert.ok(questionsFor(solar, { network: "wifi" }).some((q) => q.id === "wifi-signal"));
  assert.ok(!questionsFor(solar, { network: "4g" }).some((q) => q.id === "wifi-signal"));
  assert.equal(buildPlan(solar, { network: "wifi" }).search[0].en, "solar WiFi camera PIR outdoor");
  const dash = PRODUCT_TYPES.find((t) => t.id === "dashcam");
  assert.ok(!buildPlan(dash, { parking: "no" }).items.some((i) => i.id === "hardwire"));
  assert.equal(buildPlan(dash, { parking: "yes" }).items.find((i) => i.id === "hardwire").status, "required");
  assert.equal(buildPlan(PRODUCT_TYPES.find((t) => t.id === "safety-gear")).buyLocal.flagged, true);
});
test("plan sharing: answers round-trip through the URL and junk is dropped", () => {
  const a = { cams: "5-8", wiring: "none" };
  assert.deepEqual(decodeAnswers(encodeAnswers(a)), a);
  assert.equal(encodeAnswers({ "x y": "1", ok: "<script>" }), "");
  assert.deepEqual(decodeAnswers("a:1,<b>:2,c:,:d,e:f:g"), { a: "1", e: "f" });
  assert.deepEqual(decodeAnswers(null), {});
});
test("search links are plain aliexpress.com search URLs with encoded words", () => {
  const u = new URL(aliSearchUrl("8CH PoE NVR H.265"));
  assert.equal(u.hostname, "www.aliexpress.com");
  assert.equal(u.pathname, "/w/wholesale-8CH-PoE-NVR-H.265.html");
  assert.doesNotMatch(aliSearchUrl("a\"><script>"), /[<>"]/);
});
test("approval gate: unapproved keys hidden in production, visible in development or explicit QA", () => {
  assert.equal(visibility("type:not-approved-yet", { NODE_ENV: "production" }).visible, false);
  assert.equal(visibility("type:not-approved-yet", { NODE_ENV: "production" }).status, "draft");
  assert.equal(visibility("type:not-approved-yet", { NODE_ENV: "development" }).visible, true);
  assert.equal(draftsEnabled({ NODE_ENV: "production", DEALPILOT_SHOW_DRAFTS: "true" }), true);
  assert.equal(draftsEnabled({ NODE_ENV: "production", DEALPILOT_SHOW_DRAFTS: "1" }), false);
});
test("owner approval: every destination and guide is published in production", () => {
  const prod = visibleTypes({ NODE_ENV: "production" });
  assert.equal(prod.length, PRODUCT_TYPES.length);
  assert.ok(prod.every((t) => t.status === "approved"));
  for (const g of GUIDES) assert.equal(visibility("guide:" + g.slug, { NODE_ENV: "production" }).status, "approved");
});
test("Israeli prices: none invented; invalid owner entries are ignored", () => {
  assert.equal(ISRAEL_PRICES.length, 0);
  const good = { typeId: "dashcam", label: "x", store: "חנות", priceILS: 300, url: "https://shop.test/p", checkedAt: "2026-11-15" };
  assert.equal(validIsraelPrice(good), true);
  for (const bad of [{ priceILS: 0 }, { priceILS: NaN }, { url: "http://x" }, { checkedAt: "15/11/2026" }, { store: " " }])
    assert.equal(validIsraelPrice({ ...good, ...bad }), false);
  assert.deepEqual(pricesFor("dashcam", [good, { ...good, priceILS: -1 }, { ...good, typeId: "x" }]), [good]);
});

import { estimateImportTax } from "../lib/preflight/tax-estimate.ts";
test("per-product tax estimate: exempt / near the threshold / VAT / VAT+customs / unknown", () => {
  const rate = { rate: 3.2, date: "2026-11-13T10:19:11Z", source: "test" };
  const e = (ils, r = rate, cfg = IMPORT_TAX) => estimateImportTax(ils, r, cfg);
  assert.equal(e(100).status, "exempt"); // 31$
  assert.equal(e(100).vatIls, 0);
  assert.match(e(100).label, /פטור/);
  assert.equal(e(216).status, "exempt"); // 67.5$ = exactly 90% of 75
  assert.equal(e(230).status, "near"); // 71.9$
  assert.equal(e(240).status, "near"); // 75$ exactly → still exempt (up to 75)
  const v = e(320); // 100$
  assert.equal(v.status, "vat");
  assert.equal(v.vatIls, 58); // 18% of 320, before shipping
  assert.match(v.label, /18%/);
  assert.equal(e(1700).status, "vat_customs"); // 531$
  assert.match(e(1700).detail, /מכס/);
  assert.equal(e(null).status, "unknown");
  assert.equal(e(0).status, "unknown");
  assert.equal(e(100, null).status, "unknown");
  assert.equal(e(100, { ...rate, rate: NaN }).status, "unknown");
  assert.equal(e(100, rate, { ...IMPORT_TAX, verified: false }).status, "unknown");
  assert.match(e(100, null).label, /לא חושב/);
});


import { calculateBasketCost } from "../lib/preflight/basket-cost.ts";

test("full import cost estimator: exemption ignores separately stated shipping but includes other goods", () => {
  const base = { unitPriceILS: 260, quantity: 1, discountILS: 0, otherGoodsILS: 0, shippingILS: 30, insuranceILS: 0, handlingILS: 0, usdIlsRate: 3.5 };
  const a = calculateBasketCost(base, IMPORT_TAX);
  assert.equal(a.status, "exempt");
  assert.equal(a.estimatedVAT, 0);
  assert.equal(a.estimatedTotalILS, 290);
  const b = calculateBasketCost({ ...base, otherGoodsILS: 10 }, IMPORT_TAX);
  assert.equal(b.status, "vat_estimate");
  assert.equal(b.estimatedVAT, 54);
  assert.equal(b.estimatedTotalILS, 354);
});
test("full import cost estimator: discounts, quantity, VAT freight, insurance, unknowns and exclusions", () => {
  const base = { unitPriceILS: 250, quantity: 2, discountILS: 50, otherGoodsILS: 0, shippingILS: 20, insuranceILS: 10, handlingILS: 15, usdIlsRate: 3.5 };
  const a = calculateBasketCost(base, IMPORT_TAX);
  assert.equal(a.goodsILS, 450);
  assert.equal(a.estimatedVAT, 86.4);
  assert.equal(a.estimatedTotalILS, 581.4);
  assert.equal(calculateBasketCost({ ...base, shippingILS: null }, IMPORT_TAX).status, "incomplete");
  assert.equal(calculateBasketCost({ ...base, usdIlsRate: null }, IMPORT_TAX).estimatedTotalILS, null);
  assert.equal(calculateBasketCost({ ...base, discountILS: 900 }, IMPORT_TAX).status, "invalid");
  assert.equal(calculateBasketCost({ ...base, quantity: 1.5 }, IMPORT_TAX).status, "invalid");
  const high = calculateBasketCost({ ...base, unitPriceILS: 3000, quantity: 1 }, IMPORT_TAX);
  assert.equal(high.status, "special_tax");
  assert.equal(high.estimatedTotalILS, null);
  assert.equal(calculateBasketCost(base, { ...IMPORT_TAX, verified: false }).estimatedTotalILS, null);
});
