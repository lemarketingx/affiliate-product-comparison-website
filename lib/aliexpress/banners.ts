import "server-only";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { AffiliateError, callAffiliateMethod, configured } from "./affiliate";
import { categories } from "../dealpilot/categories";
import {
  checkGeneratedLink,
  classifyRedirect,
  parseFeaturedPromos,
  parseGeneratedLinks,
  parsePromoProducts,
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

async function build(): Promise<BannerSnapshot> {
  const now = Date.now();
  const tid = trackingId();
  const errors: Record<string, number> = {};
  const fail = (code: string) => (errors[code] = (errors[code] ?? 0) + 1);
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
      if (!got.ok) fail(got.code);
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
            if (!prods.ok) { fail(prods.code); banner.reason = "לא התקבלו מוצרי הקמפיין: " + prods.code; return; }
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
  const pending = banners.filter((b) => b.timing === "active" && b.sourceUrl && !b.reason);
  if (!tid) pending.forEach((b) => (b.reason = "ALIEXPRESS_TRACKING_ID לא מוגדר בשרת"));
  else if (!configured()) pending.forEach((b) => (b.reason = "חיבור ה־API אינו מוגדר"));
  else if (pending.length) {
    try {
      const sources = [...new Set(pending.map((b) => b.sourceUrl!))];
      const got = unwrapResult(
        await callAffiliateMethod("aliexpress.affiliate.link.generate", {
          promotion_link_type: "0", source_values: sources.join(","), tracking_id: tid,
        }, GUARD),
        "aliexpress.affiliate.link.generate",
      );
      if (!got.ok) {
        fail(got.code);
        pending.forEach((b) => (b.reason = got.code.includes("PERMISSION") ? "אין הרשאה ליצירת קישורים: " + got.code : "יצירת הקישור נכשלה: " + got.code));
      } else {
        const gen = parseGeneratedLinks(got.result);
        for (const b of pending) {
          const check = checkGeneratedLink(gen, b.sourceUrl!, tid);
          if (!check.ok) { b.reason = check.reason; continue; }
          b.link = gen.links.find((l) => l.source === b.sourceUrl)!.link;
          b.status = "published";
        }
      }
    } catch (e) {
      fail(codeOf(e));
      pending.forEach((b) => (b.reason = "יצירת הקישור נכשלה: " + codeOf(e)));
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
    banners,
  };
}

const cached = unstable_cache(build, ["dealpilot-banners-v1", NS], { revalidate: 3600 });
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
