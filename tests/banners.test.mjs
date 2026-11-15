import test from "node:test";
import assert from "node:assert/strict";
import {
  unwrapResult, parseFeaturedPromos, parsePromoProducts, parseGeneratedLinks, checkGeneratedLink,
  classifyRedirect, timing, parseProviderTime, canonicalSource, maskLink, safeProviderMessage, isTrackingIdRejection,
} from "../lib/aliexpress/promo-parse.ts";
import { validPortalBanner, maskTrackingId, ATTRIBUTION, PORTAL_BANNERS } from "../lib/aliexpress/banner-config.ts";

const M = "aliexpress.affiliate.link.generate";
const wrap = (method, result, code = 200, msg = "") => ({ [method.replace(/\./g, "_") + "_response"]: { resp_result: { resp_code: code, resp_msg: msg, result } } });
const SRC = "https://www.aliexpress.com/item/1005001234567.html";

test("unwrap: provider errors and permission denials become codes, never success", () => {
  assert.equal(unwrapResult({ error_response: { code: "InsufficientPermission", msg: "secret detail" } }, M).code, "PROVIDER_ERROR_InsufficientPermission");
  assert.equal(unwrapResult(wrap(M, {}, 402, "No permission to access"), M).code, "PROVIDER_RESULT_402_PERMISSION");
  assert.equal(unwrapResult(wrap(M, {}, 402, "No permission to access"), M).ok, false);
  assert.equal(unwrapResult({}, M).ok, false);
  assert.equal(unwrapResult(null, M).ok, false);
  assert.equal(unwrapResult(wrap(M, { a: 1 }), M).ok, true);
});
test("featured promos: tolerant parsing; unknown dates/counts stay null; provider time UTC+8", () => {
  const r = parseFeaturedPromos({ promos: { promo: [
    { promo_name: "Hot Product", promo_desc: "desc", product_num: "1200" },
    { promo_name: "11.11", promo_end_time: "2026-11-20 23:59:59", promo_start_time: "2026-11-01 00:00:00" },
    { promo_desc: "no name" },
  ] } });
  assert.equal(r.promos.length, 2);
  assert.deepEqual(r.promos[0], { name: "Hot Product", description: "desc", productCount: 1200, startsAt: null, endsAt: null });
  assert.equal(r.promos[1].endsAt, "2026-11-20T15:59:59.000Z");
  assert.ok(r.fieldsSeen.includes("promo_end_time"));
  assert.equal(parseProviderTime("garbage"), null);
  assert.equal(parseProviderTime("2026-11-20T10:00:00Z"), "2026-11-20T10:00:00.000Z");
});
test("promo products: only https AliExpress URLs and images survive", () => {
  const p = parsePromoProducts({ products: { product: [
    { product_id: "1005001234567", product_title: "x", product_detail_url: SRC, product_main_image_url: "https://ae01.alicdn.com/kf/a.jpg" },
    { product_id: "1005001234568", product_title: "y", product_detail_url: "https://evil.test/item", product_main_image_url: "http://ae01.alicdn.com/a.jpg" },
    { product_id: "bad", product_title: "z" },
  ] } });
  assert.equal(p.length, 2);
  assert.equal(p[1].productUrl, null);
  assert.equal(p[1].image, null);
});
test("generated link: valid link + echoed matching tracking id is required to publish", () => {
  const gen = (over = {}) => ({ ...parseGeneratedLinks({ tracking_id: "dealpilot", promotion_links: { promotion_link: [{ source_value: SRC, promotion_link: "https://s.click.aliexpress.com/e/_abc" }] } }), ...over });
  assert.deepEqual(checkGeneratedLink(gen(), SRC, "dealpilot"), { ok: true });
  assert.equal(checkGeneratedLink(gen(), SRC, "other-id").ok, false);
  assert.equal(checkGeneratedLink(gen({ trackingId: null }), SRC, "dealpilot").ok, false);
  assert.equal(checkGeneratedLink(gen(), "https://www.aliexpress.com/item/999.html", "dealpilot").ok, false);
  assert.equal(checkGeneratedLink(gen({ links: [{ source: SRC, link: SRC }] }), SRC, "dealpilot").ok, false);
  assert.equal(checkGeneratedLink(gen({ links: [{ source: SRC, link: "https://s.click.aliexpress.com.evil.test/e/x" }] }), SRC, "dealpilot").ok, false);
  assert.equal(checkGeneratedLink(gen({ links: [{ source: SRC, link: "http://s.click.aliexpress.com/e/x" }] }), SRC, "dealpilot").ok, false);
  assert.equal(checkGeneratedLink(gen({ links: [{ source: SRC, link: null }] }), SRC, "dealpilot").ok, false);
});
test("redirect classification: must stay on AliExpress and end on a real page", () => {
  assert.equal(classifyRedirect([{ status: 302, host: "s.click.aliexpress.com" }, { status: 200, host: "www.aliexpress.com" }]).ok, true);
  assert.equal(classifyRedirect([{ status: 302, host: "s.click.aliexpress.com" }, { status: 0, host: "evil.test" }]).ok, false);
  assert.equal(classifyRedirect([{ status: 302, host: "s.click.aliexpress.com" }, { status: 404, host: "www.aliexpress.com" }]).ok, false);
  const js = classifyRedirect([{ status: 200, host: "s.click.aliexpress.com" }]);
  assert.equal(js.ok, false);
  assert.match(js.note, /בדיקה ידנית/);
  assert.equal(classifyRedirect([], "timeout").ok, false);
});
test("timing: expired campaigns are removed, upcoming are not shown yet, unknown end stays active", () => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  assert.equal(timing(null, "2026-11-15T11:59:59Z", now), "expired");
  assert.equal(timing("2026-11-16T00:00:00Z", null, now), "upcoming");
  assert.equal(timing(null, null, now), "active");
  assert.equal(timing("2026-11-01T00:00:00Z", "2026-11-20T00:00:00Z", now), "active");
});
test("portal banners: validated; nothing preloaded or invented; attribution not claimed", () => {
  assert.equal(PORTAL_BANNERS.length, 0);
  assert.equal(ATTRIBUTION.confirmed, false);
  const ok = { id: "summer-sale", title: "Summer Sale", imagePath: "/banners/summer.jpg", imageWidth: 1200, imageHeight: 628, landingUrl: "https://sale.aliexpress.com/x.htm", startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-30T00:00:00Z", addedAt: "2026-11-15" };
  assert.equal(validPortalBanner(ok), null);
  for (const bad of [{ id: "Bad Id" }, { imagePath: "https://cdn.test/x.jpg" }, { landingUrl: "https://evil.test/x" }, { endsAt: "2026-10-01T00:00:00Z" }, { imageWidth: 0 }])
    assert.notEqual(validPortalBanner({ ...ok, ...bad }), null, JSON.stringify(bad));
  assert.equal(maskTrackingId("dealpilot"), "de*****ot");
  assert.equal(maskTrackingId(null), null);
});

test("canonical source: locale subdomain, slugs, query and tracking params removed", () => {
  assert.equal(canonicalSource("https://he.aliexpress.com/item/1005001234567.html?gatewayAdapt=glo2isr&aff_fcid=x"), "https://www.aliexpress.com/item/1005001234567.html");
  assert.equal(canonicalSource("https://www.aliexpress.us/item/3256801234567890.html#x"), "https://www.aliexpress.com/item/3256801234567890.html");
  assert.equal(canonicalSource("https://sale.aliexpress.com/__pc/sale.htm?spm=1"), "https://sale.aliexpress.com/__pc/sale.htm");
  assert.equal(canonicalSource("https://evil.test/item/1005001234567.html"), null);
  assert.equal(canonicalSource("http://www.aliexpress.com/item/1005001234567.html"), null);
});
test("safe diagnostics: provider text without URLs, tracking id, keys or long tokens", () => {
  const m = safeProviderMessage("Invalid parameter source_values: https://he.aliexpress.com/item/1.html?aff=1 for tracking dealpilot-qa key 12345678 tok AbCdEfGhIjKlMnOpQrStUvWxYz123", ["dealpilot-qa", "12345678"]);
  assert.ok(m.includes("source_values"));
  assert.ok(!m.includes("aliexpress.com"));
  assert.ok(!m.includes("dealpilot-qa"));
  assert.ok(!m.includes("12345678"));
  assert.ok(!m.includes("AbCdEfGhIjKlMnOpQrStUvWxYz123"));
  assert.ok(m.length <= 200);
  assert.equal(safeProviderMessage(null), null);
  assert.equal(maskLink("https://s.click.aliexpress.com/e/_DlAbCdEf?x=1"), "s.click.aliexpress.com/e/_D…?…");
  assert.equal(maskLink(null), null);
});
test("unwrap keeps the raw provider message for sanitising, plus error_response sub messages", () => {
  const r = unwrapResult({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 402, resp_msg: "Invalid parameter tracking_id" } } }, M);
  assert.equal(r.code, "PROVIDER_RESULT_402_INVALID_PARAMETER");
  assert.equal(r.message, "Invalid parameter tracking_id");
  const e = unwrapResult({ error_response: { code: "15", msg: "Remote service error", sub_code: "isv.invalid-parameter", sub_msg: "source_values illegal" } }, M);
  assert.equal(e.message, "Remote service error · isv.invalid-parameter · source_values illegal");
});

test("retry default only for explicit tracking id rejection, not generic 402", () => {
  assert.equal(isTrackingIdRejection("PROVIDER_RESULT_402_INVALID_PARAMETER", "TrackingId input parameter error"), true);
  assert.equal(isTrackingIdRejection("PROVIDER_RESULT_402_INVALID_PARAMETER", "tracking_id invalid"), true);
  assert.equal(isTrackingIdRejection("PROVIDER_RESULT_402_INVALID_PARAMETER", "source_values invalid"), false);
  assert.equal(isTrackingIdRejection("PROVIDER_RESULT_402_PERMISSION", "Access denied"), false);
  assert.equal(isTrackingIdRejection("PROVIDER_UNREACHABLE", "TrackingId input parameter error"), false);
  assert.equal(isTrackingIdRejection("PROVIDER_RESULT_402_INVALID_PARAMETER", null), false);
});
