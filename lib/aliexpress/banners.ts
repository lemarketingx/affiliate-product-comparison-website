import "server-only";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { AffiliateError, callAffiliateMethod, configured } from "./affiliate";
import { categories } from "../dealpilot/categories";
import {
  canonicalSource,
  checkGeneratedLink,
  classifyRedirect,
  maskLink,
  safeProviderMessage,
  type GeneratedLinks,
  parseFeaturedPromos,
  parseGeneratedLinks,
  parsePromoProducts,
  isTrackingIdRejection,
  timing,
  unwrapResult,
  type BannerTiming,
  type RedirectHop,
  type RedirectResult,
} from "./promo-parse";
import { ATTRIBUTION, PORTAL_BANNERS, maskTrackingId, validPortalBanner } from "./banner-config";

export type BannerSource = "portals" | "featuredpromo" | "category";
export type BannerStatus = "published" | "blocked" | "expired" | "upcoming" | "fallback";
export type Banner = {
  id: string;
  source: BannerSource;
  title: string;
  description: string | null;
  image: string | null;
  imageFit: "contain" | "cover";
  startsAt: string | null;
  endsAt: string | null;
  timing: BannerTiming;
  status: BannerStatus;
  reason: string | null;
  sourceUrl: string | null;
  link: string | null; // generated affiliate link (or internal path for category fallbacks)
  trackingSource?: "configured" | "default"; // do not claim original ID attribution after fallback
  /** Source exactly as the provider returned it, before canonicalisation (admin diagnostics). */
  originalSource?: string | null;
  productCount: number | null;
};
export type BannerSnapshot = {
  checkedAt: string;
  apiConfigured: boolean;
  trackingConfigured: boolean;
  trackingIdMasked: string | null;
  promosFound: number;
  promoFieldsSeen: string[];
  errors: Record<string, number>;
  /** Provider messages with URLs, tracking id and keys removed. */
  errorDetails: { code: string; message: string | null }[];
  banners: Banner[];
};

const NS = process.env.DEALPILOT_CACHE_NAMESPACE ?? "default";
const GUARD = { key: "aliexpress-banners", limit: 30, periodMs: 3600000 };
const MAX_PROMOS = 6;

function trackingId(): string | null {
  const t = process.env.ALIEXPRESS_TRACKING_ID?.trim();
  return t && /^[\w-]{1,64}$/.test(t) ? t : null;
}
const codeOf = (e: unknown) => (e instanceof AffiliateError ? e.code : "UNKNOWN");
const secrets = () => [trackingId(), process.env.ALIEXPRESS_APP_KEY?.trim(), process.env.ALIEXPRESS_APP_SECRET?.trim()];

type GenResult = { ok: true; gen: GeneratedLinks } | { ok: false; code: string; message: string | null };
/** One link.generate call. Only documented parameter names are sent. */
async function generateLink(source: string, tid: string | null, extra: Record<string, string>): Promise<GenResult> {
  const params: Record<string, string> = { ...extra, source_values: source };
  if (tid) params.tracking_id = tid;
  try {
    const got = unwrapResult(await callAffiliateMethod("aliexpress.affiliate.link.generate", params, GUARD), "aliexpress.affiliate.link.generate");
    if (!got.ok) return { ok: false, code: got.code, message: got.message ?? null };
    return { ok: true, gen: parseGeneratedLinks(got.result) };
  } catch (e) {
    return { ok: false, code: codeOf(e), message: null };
  }
}

export type ProbeVariant = {
  name: string;
  changed: string;
  params: Record<string, string>;
  code: string | null;
  message: string | null;
  linkReturned: string | null; // masked
  trackingEchoed: "same" | "different" | "missing" | null;
  ok: boolean;
};
/**
 * Admin diagnostic: one link.generate call per variant, changing one thing at
 * a time against a known-good baseline. Values are described, never echoed:
 * no keys, no tracking id, no full generated links.
 */
export async function probeLinkGenerate(rawSource: string): Promise<{ source: string; variants: ProbeVariant[] }> {
  const tid = trackingId();
  const canonical = canonicalSource(rawSource);
  const describe = (p: Record<string, string>) =>
    Object.fromEntries(Object.entries(p).map(([k, v]) => [k,
      k === "tracking_id" ? `מוגדר (${v.length} תווים)` :
      k === "source_values" ? (v === canonical ? "כתובת מוצר קנונית" : "כתובת כפי שהתקבלה מה־API") + " · " + maskLink(v) :
      v]));
  const plan: { name: string; changed: string; source: string; tid: string | null; extra: Record<string, string> }[] = [];
  if (canonical) {
    plan.push({ name: "A", changed: "בסיס: כתובת קנונית + tracking_id + promotion_link_type=0", source: canonical, tid, extra: { promotion_link_type: "0" } });
    plan.push({ name: "B", changed: "בלי promotion_link_type", source: canonical, tid, extra: {} });
    plan.push({ name: "C", changed: "promotion_link_type=2", source: canonical, tid, extra: { promotion_link_type: "2" } });
    plan.push({ name: "D", changed: "בלי tracking_id (לבדיקה בלבד, לא לפרסום)", source: canonical, tid: null, extra: { promotion_link_type: "0" } });
  }
  if (rawSource !== canonical)
    plan.push({ name: "E", changed: "הכתובת המקורית כפי שהתקבלה (לא קנונית)", source: rawSource, tid, extra: { promotion_link_type: "0" } });
  const variants: ProbeVariant[] = [];
  for (const v of plan) {
    const r = await generateLink(v.source, v.tid, v.extra);
    const params = describe({ ...v.extra, source_values: v.source, ...(v.tid ? { tracking_id: v.tid } : {}) });
    if (!r.ok) {
      variants.push({ name: v.name, changed: v.changed, params, code: r.code, message: safeProviderMessage(r.message, secrets()), linkReturned: null, trackingEchoed: null, ok: false });
      continue;
    }
    const row = r.gen.links.find((l) => l.source === v.source) ?? r.gen.links[0];
    const echoed = !r.gen.trackingId ? "missing" : tid && r.gen.trackingId === tid ? "same" : "different";
    variants.push({
      name: v.name, changed: v.changed, params, code: "200", message: null,
      linkReturned: maskLink(row?.link ?? null), trackingEchoed: echoed,
      ok: Boolean(tid && v.tid && checkGeneratedLink(r.gen, v.source, tid).ok),
    });
  }
  return { source: maskLink(canonical ?? rawSource) ?? "", variants };
}

async function build(): Promise<BannerSnapshot> {
  const now = Date.now();
  const tid = trackingId();
  const errors: Record<string, number> = {};
  const errorDetails: { code: string; message: string | null }[] = [];
  const fail = (code: string, message?: string | null) => {
    errors[code] = (errors[code] ?? 0) + 1;
    const safe = safeProviderMessage(message, secrets());
    if (!errorDetails.some((d) => d.code === code && d.message === safe) && errorDetails.length < 10)
      errorDetails.push({ code, message: safe });
  };
  const banners: Banner[] = [];
  let promosFound = 0;
  let promoFieldsSeen: string[] = [];

  // 1. Owner-imported official Portals creatives.
  for (const b of PORTAL_BANNERS) {
    const invalid = validPortalBanner(b);
    const t = timing(b.startsAt, b.endsAt, now);
    banners.push({
      id: "p-" + b.id, source: "portals", title: b.title, description: null, image: b.imagePath, imageFit: "contain",
      startsAt: b.startsAt, endsAt: b.endsAt, timing: t,
      status: invalid ? "blocked" : t === "active" ? "blocked" : t, reason: invalid, sourceUrl: invalid ? null : b.landingUrl,
      link: null, productCount: null,
    });
  }

  // 2. Featured promotions from the Affiliate API (names/dates only; no banner images exist in the API).
  if (configured()) {
    try {
      const got = unwrapResult(await callAffiliateMethod("aliexpress.affiliate.featuredpromo.get", {}, GUARD), "aliexpress.affiliate.featuredpromo.get");
      if (!got.ok) fail(got.code, got.message);
      else {
        const { promos, fieldsSeen } = parseFeaturedPromos(got.result);
        promosFound = promos.length;
        promoFieldsSeen = fieldsSeen;
        const active: { banner: Banner; name: string }[] = [];
        for (const [i, p] of promos.slice(0, MAX_PROMOS).entries()) {
          const t = timing(p.startsAt, p.endsAt, now);
          const banner: Banner = {
            id: "f-" + i + "-" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
            source: "featuredpromo", title: p.name, description: p.description, image: null, imageFit: "cover",
            startsAt: p.startsAt, endsAt: p.endsAt, timing: t, status: t === "active" ? "blocked" : t,
            reason: null, sourceUrl: null, link: null, productCount: p.productCount,
          };
          banners.push(banner);
          if (t === "active") active.push({ banner, name: p.name });
        }
        // Top product per active campaign, fetched in parallel.
        await Promise.all(active.map(async ({ banner, name }) => {
          try {
            const prods = unwrapResult(
              await callAffiliateMethod("aliexpress.affiliate.featuredpromo.products.get", {
                promotion_name: name, page_no: "1", page_size: "1",
                target_currency: "ILS", target_language: "HE", country: "IL",
              }, GUARD),
              "aliexpress.affiliate.featuredpromo.products.get",
            );
            if (!prods.ok) { fail(prods.code, prods.message); banner.reason = "לא התקבלו מוצרי הקמפיין: " + prods.code; return; }
            const top = parsePromoProducts(prods.result)[0];
            if (!top?.productUrl) { banner.reason = "לקמפיין לא הוחזר מוצר עם קישור תקין"; return; }
            banner.image = top.image;
            banner.sourceUrl = top.productUrl;
          } catch (e) {
            fail(codeOf(e));
            banner.reason = "שגיאה בשליפת מוצרי הקמפיין: " + codeOf(e);
          }
        }));
      }
    } catch (e) {
      fail(codeOf(e));
    }
  }

  // 3. One affiliate link per banner via link.generate with the server's tracking id.
  // One call per source, so a single rejected URL cannot fail the others, and
  // sources are canonicalised (no locale subdomain, query or tracking params).
  const pending = banners.filter((b) => b.timing === "active" && b.sourceUrl && !b.reason);
  if (!tid) pending.forEach((b) => (b.reason = "ALIEXPRESS_TRACKING_ID לא מוגדר בשרת"));
  else if (!configured()) pending.forEach((b) => (b.reason = "חיבור ה־API אינו מוגדר"));
  else {
    for (const b of pending) {
      const canonical = canonicalSource(b.sourceUrl!);
      b.originalSource = b.sourceUrl;
      if (!canonical) b.reason = "כתובת המקור אינה כתובת AliExpress תקינה";
      else b.sourceUrl = canonical;
    }
    const ready = pending.filter((b) => !b.reason);
    // AliExpress can reject an obsolete/unregistered configured tracking id.
    // "default" is tried ONLY if the provider explicitly rejects tracking_id;
    // it is never silently trusted: its echoed ID and generated link must match.
    let verifiedDefault = false;
    for (let i = 0; i < ready.length; i += 3) {
      await Promise.all(ready.slice(i, i + 3).map(async (b) => {
        let usedId = verifiedDefault ? "default" : tid;
        let r = await generateLink(b.sourceUrl!, usedId, { promotion_link_type: "0" });
        if (!r.ok && usedId !== "default" && isTrackingIdRejection(r.code, r.message)) {
          fail("CONFIGURED_TRACKING_ID_REJECTED", "TrackingId input parameter error");
          const fallback = await generateLink(b.sourceUrl!, "default", { promotion_link_type: "0" });
          if (fallback.ok && checkGeneratedLink(fallback.gen, b.sourceUrl!, "default").ok) {
            r = fallback;
            usedId = "default";
            verifiedDefault = true;
          } else {
            // Never publish an unverified URL, even when default returns a link.
            if (!fallback.ok) fail(fallback.code, fallback.message);
            b.reason = "מזהה המעקב שהוגדר נדחה. יש לבחור Tracking ID פעיל מתוך AliExpress Portals > Account > Tracking ID";
            return;
          }
        }
        if (!r.ok) {
          fail(r.code, r.message);
          b.reason = (r.code.includes("PERMISSION") ? "אין הרשאה ליצירת קישורים: " : "יצירת הקישור נכשלה: ") + r.code;
          return;
        }
        const check = checkGeneratedLink(r.gen, b.sourceUrl!, usedId);
        if (!check.ok) { b.reason = check.reason; return; }
        b.link = r.gen.links.find((l) => l.source === b.sourceUrl)!.link;
        b.trackingSource = usedId === tid ? "configured" : "default";
        b.status = "published";
      }));
    }
  }
  for (const b of banners) if (b.status === "blocked" && !b.reason) b.reason = "לא נוצר קישור שותפים";

  return {
    checkedAt: new Date(now).toISOString(),
    apiConfigured: configured(),
    trackingConfigured: Boolean(tid),
    trackingIdMasked: maskTrackingId(tid),
    promosFound,
    promoFieldsSeen,
    errors,
    errorDetails,
    banners,
  };
}

const cached = unstable_cache(build, ["dealpilot-banners-v3-tracking-recheck", NS], { revalidate: 3600 });
export async function getBannerSnapshot(): Promise<BannerSnapshot> {
  return cached();
}

function categoryFallbacks(): Banner[] {
  return categories.slice(0, 3).map((c) => ({
    id: "c-" + c.slug, source: "category" as const, title: c.label, description: c.description, image: null,
    imageFit: "cover" as const, startsAt: null, endsAt: null, timing: "active" as const, status: "fallback" as const,
    reason: null, sourceUrl: null, link: "/categories/" + c.slug, productCount: null,
  }));
}

/**
 * Banners for the homepage: only published (valid generated link) and still
 * active right now. Expired campaigns disappear; if none remain, regular
 * category banners take their place (internal links, no affiliate claim).
 */
export async function getPublicBanners(now = Date.now(), waitMs = 1500): Promise<{ banners: Banner[]; attributionConfirmed: boolean }> {
  let live: Banner[] = [];
  try {
    // Never hold the homepage for a cold banner build; finish it after the response.
    const pending = getBannerSnapshot();
    const snap = await Promise.race([pending, new Promise<null>((r) => setTimeout(() => r(null), waitMs))]);
    if (!snap) {
      try {
        after(() => pending.then(() => undefined, () => undefined));
      } catch {}
      return { banners: categoryFallbacks(), attributionConfirmed: ATTRIBUTION.confirmed };
    }
    live = snap.banners.filter((b) => b.status === "published" && b.link && timing(b.startsAt, b.endsAt, now) === "active");
  } catch {
    live = [];
  }
  return { banners: live.length ? live.slice(0, 6) : categoryFallbacks(), attributionConfirmed: ATTRIBUTION.confirmed };
}

export async function findPublishedBanner(id: string, now = Date.now()): Promise<Banner | null> {
  const snap = await getBannerSnapshot();
  return snap.banners.find((b) => b.id === id && b.status === "published" && b.link && timing(b.startsAt, b.endsAt, now) === "active") ?? null;
}

// Redirect verification (admin-triggered). Follows the chain manually and never
// leaves AliExpress domains. Results are kept in memory for this process only.
// Shared via globalThis: route handlers and pages can be separate module instances.
const g = globalThis as typeof globalThis & { __dealpilotRedirectChecks?: Map<string, RedirectResult & { checkedAt: string }> };
export const redirectChecks: Map<string, RedirectResult & { checkedAt: string }> = (g.__dealpilotRedirectChecks ??= new Map());
export async function verifyRedirect(link: string): Promise<RedirectResult> {
  const hops: RedirectHop[] = [];
  let url = link;
  try {
    for (let i = 0; i < 6; i++) {
      const u = new URL(url);
      if (u.protocol !== "https:") return classifyRedirect(hops, "הפניה לכתובת לא מאובטחת");
      const res = await fetch(url, { method: "GET", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (DealPilot link check)" } });
      hops.push({ status: res.status, host: u.hostname.toLowerCase() });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url).href;
        const host = new URL(url).hostname.toLowerCase();
        if (!["aliexpress.com", "aliexpress.us", "aliexpress.ru"].some((d) => host === d || host.endsWith("." + d))) {
          hops.push({ status: 0, host });
          return classifyRedirect(hops);
        }
        continue;
      }
      return classifyRedirect(hops);
    }
    return classifyRedirect(hops, "יותר מדי הפניות");
  } catch {
    return classifyRedirect(hops, "הבדיקה נכשלה (רשת או זמן קצוב)");
  }
}
