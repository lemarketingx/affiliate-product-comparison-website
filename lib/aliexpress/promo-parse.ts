// Pure parsing and safety rules for official AliExpress promotions and
// generated affiliate links. Field names are taken from third-party SDK
// descriptions; anything not returned stays null and is shown as "לא דווח".

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : null;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const first = (r: Rec, keys: string[]) => {
  for (const k of keys) {
    const s = str(r[k]);
    if (s) return s;
  }
  return null;
};

export type Unwrapped = { ok: true; result: Rec } | { ok: false; code: string; message?: string | null };

/** Only a provider rejection explicitly naming tracking_id merits a default-ID retry.
 * Other 402 errors (source_values, permissions) must not trigger blind retries.
 */
export function isTrackingIdRejection(code: string, message: string | null): boolean {
  return /PROVIDER_(?:RESULT_402|ERROR_402)/.test(code) &&
    /tracking[\s_-]*id/i.test(message ?? "");
}

/**
 * Provider error text is useful for diagnosis but may echo request values.
 * Remove URLs, the given secrets (tracking id, app key) and long tokens; keep
 * parameter names and short words. Never returns more than 200 characters.
 */
export function safeProviderMessage(raw: unknown, secrets: (string | null | undefined)[] = []): string | null {
  let s = str(raw);
  if (!s) return null;
  for (const secret of secrets) if (secret && secret.length >= 3) s = s.split(secret).join("[redacted]");
  s = s
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[\w-]*\.aliexpress\.[a-z]+\S*/gi, "[url]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[token]")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, 200) || null;
}
/** aliexpress.affiliate.x.y → aliexpress_affiliate_x_y_response.resp_result.result */
export function unwrapResult(payload: unknown, method: string): Unwrapped {
  const root = rec(payload);
  if (!root) return { ok: false, code: "INVALID_RESPONSE" };
  const err = rec(root.error_response);
  if (err)
    return {
      ok: false,
      code: "PROVIDER_ERROR_" + (str(err.code) ?? "UNKNOWN").replace(/[^\w-]/g, "").slice(0, 40),
      message: [str(err.msg), str(err.sub_code), str(err.sub_msg)].filter(Boolean).join(" · ") || null,
    };
  const resp = rec(root[method.replace(/\./g, "_") + "_response"]);
  const rr = rec(resp?.resp_result);
  if (!rr) return { ok: false, code: "UNEXPECTED_RESPONSE_SHAPE" };
  const code = str(rr.resp_code);
  if (code !== "200") {
    const rawMsg = str(rr.resp_msg) ?? str(rr.msg) ?? null;
    const msg = (rawMsg ?? "").toLowerCase();
    const hint = /permission|access|authori|权限|授权/.test(msg) ? "_PERMISSION" : /param|invalid|illegal|参数/.test(msg) ? "_INVALID_PARAMETER" : /track/.test(msg) ? "_TRACKING" : "";
    return { ok: false, code: "PROVIDER_RESULT_" + (code ?? "UNKNOWN").replace(/[^\w-]/g, "") + hint, message: rawMsg };
  }
  return { ok: true, result: rec(rr.result) ?? {} };
}

/** "2026-11-20 23:59:59" (provider time, assumed UTC+8) or ISO → ISO string, else null. */
export function parseProviderTime(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  const t = m ? Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}+08:00`) : /^\d{4}-\d{2}-\d{2}T/.test(s) ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export type FeaturedPromo = {
  name: string;
  description: string | null;
  productCount: number | null;
  startsAt: string | null;
  endsAt: string | null;
};
export function parseFeaturedPromos(result: Rec): { promos: FeaturedPromo[]; fieldsSeen: string[] } {
  const rows = list(rec(result.promos)?.promo ?? result.promos ?? result.promo_list);
  const fields = new Set<string>();
  const promos: FeaturedPromo[] = [];
  for (const row of rows) {
    const r = rec(row);
    if (!r) continue;
    Object.keys(r).forEach((k) => fields.add(k));
    const name = first(r, ["promo_name", "promotion_name", "name"]);
    if (!name || name.length > 200) continue;
    const n = Number(first(r, ["product_num", "product_count"]));
    promos.push({
      name,
      description: first(r, ["promo_desc", "promotion_desc", "description"])?.slice(0, 400) ?? null,
      productCount: Number.isSafeInteger(n) && n >= 0 ? n : null,
      startsAt: parseProviderTime(first(r, ["promo_start_time", "promotion_start_time", "start_time"])),
      endsAt: parseProviderTime(first(r, ["promo_end_time", "promotion_end_time", "end_time"])),
    });
  }
  return { promos, fieldsSeen: [...fields].sort() };
}

export type PromoProduct = { id: string; title: string; image: string | null; productUrl: string | null; promotionLink: string | null };
const ALI_HOSTS = ["aliexpress.com", "aliexpress.us"];
const IMG_HOSTS = ["alicdn.com", "aliexpress-media.com", "aliexpress.com"];
export function safeHttps(raw: unknown, hosts: string[]): string | null {
  const s = str(raw);
  if (!s) return null;
  try {
    const u = new URL(s);
    const h = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    return hosts.some((d) => h === d || h.endsWith("." + d)) ? u.href : null;
  } catch {
    return null;
  }
}
export function parsePromoProducts(result: Rec): PromoProduct[] {
  return list(rec(result.products)?.product ?? result.products).flatMap((row) => {
    const r = rec(row);
    const id = r && str(r.product_id);
    const title = r && str(r.product_title);
    if (!r || !id || !/^\d{4,24}$/.test(id) || !title) return [];
    return [{ id, title, image: safeHttps(r.product_main_image_url, IMG_HOSTS), productUrl: safeHttps(r.product_detail_url, ALI_HOSTS), promotionLink: safeHttps(r.promotion_link, ["s.click.aliexpress.com"]) }];
  });
}

export type GeneratedLinks = { trackingId: string | null; links: { source: string; link: string | null }[] };
export function parseGeneratedLinks(result: Rec): GeneratedLinks {
  return {
    trackingId: str(result.tracking_id),
    links: list(rec(result.promotion_links)?.promotion_link ?? result.promotion_links).flatMap((row) => {
      const r = rec(row);
      const source = r && str(r.source_value);
      return r && source ? [{ source, link: str(r.promotion_link) }] : [];
    }),
  };
}

export type LinkCheck = { ok: true } | { ok: false; reason: string };
const AFF_HOSTS = ["s.click.aliexpress.com", "aliexpress.com", "aliexpress.us"];
/**
 * A generated link is publishable only if: the provider returned it for exactly
 * this source, it is https on an AliExpress affiliate host, it is not the
 * source URL itself, and the provider echoed back the tracking id we requested.
 */
export function checkGeneratedLink(gen: GeneratedLinks, source: string, requestedTrackingId: string): LinkCheck {
  const row = gen.links.find((l) => l.source === source);
  if (!row) return { ok: false, reason: "ה־API לא החזיר קישור עבור הכתובת הזו" };
  const link = safeHttps(row.link, AFF_HOSTS);
  if (!link) return { ok: false, reason: "הקישור שהוחזר אינו קישור AliExpress מאובטח" };
  if (link === source) return { ok: false, reason: "הוחזרה הכתובת המקורית, לא קישור שותפים" };
  if (!gen.trackingId) return { ok: false, reason: "ה־API לא החזיר מזהה מעקב, ולכן אי אפשר לאמת שהקישור שייך לחשבון" };
  if (gen.trackingId !== requestedTrackingId) return { ok: false, reason: "מזהה המעקב שהוחזר שונה מזה שהוגדר בשרת" };
  return { ok: true };
}

export type RedirectHop = { status: number; host: string };
export type RedirectResult = { ok: boolean; hops: RedirectHop[]; finalHost: string | null; note: string };
/** Classifies a manually-followed redirect chain from a generated link. */
export function classifyRedirect(hops: RedirectHop[], error?: string): RedirectResult {
  const allowed = (h: string) => ["aliexpress.com", "aliexpress.us", "aliexpress.ru"].some((d) => h === d || h.endsWith("." + d));
  if (error) return { ok: false, hops, finalHost: hops.at(-1)?.host ?? null, note: error };
  if (!hops.length) return { ok: false, hops, finalHost: null, note: "לא התקבלה תשובה" };
  if (hops.some((h) => !allowed(h.host))) return { ok: false, hops, finalHost: hops.at(-1)!.host, note: "ההפניה יצאה מדומיין של AliExpress" };
  const last = hops.at(-1)!;
  if (last.status >= 400) return { ok: false, hops, finalHost: last.host, note: "היעד החזיר שגיאה " + last.status };
  if (hops.length === 1 && last.host === "s.click.aliexpress.com")
    return { ok: false, hops, finalHost: last.host, note: "אין הפניית שרת; ייתכן שההפניה מתבצעת בדפדפן. נדרשת בדיקה ידנית" };
  return { ok: true, hops, finalHost: last.host, note: "ההפניה הסתיימה בעמוד AliExpress" };
}

export type BannerTiming = "active" | "expired" | "upcoming";
export function timing(startsAt: string | null, endsAt: string | null, now: number): BannerTiming {
  if (endsAt && Date.parse(endsAt) <= now) return "expired";
  if (startsAt && Date.parse(startsAt) > now) return "upcoming";
  return "active";
}

/**
 * Canonical source for link generation. Product URLs are reduced to
 * https://www.aliexpress.com/item/<id>.html (no locale subdomain, no query,
 * no tracking params). Other AliExpress pages keep host+path, drop query/hash.
 */
export function canonicalSource(raw: string): string | null {
  const url = safeHttps(raw, ALI_HOSTS);
  if (!url) return null;
  const u = new URL(url);
  const m = /\/item\/(?:[^/]*\/)?(\d{6,24})\.html$/i.exec(u.pathname);
  if (m) return `https://www.aliexpress.com/item/${m[1]}.html`;
  return `https://${u.hostname.toLowerCase()}${u.pathname}`;
}

/** Shows that a link exists without exposing its tracking key. */
export function maskLink(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const path = u.pathname.length > 6 ? u.pathname.slice(0, 5) + "…" : u.pathname;
    return u.hostname + path + (u.search ? "?…" : "");
  } catch {
    return "[invalid]";
  }
}
