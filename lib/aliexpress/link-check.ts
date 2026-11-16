// Affiliate link verification (pure; the fetcher is injected).
// Follows a stored promotion link's redirects WITHOUT loading the final
// product page, and checks: every hop stays on AliExpress, the link reaches
// the SAME product id we list, and affiliate tracking parameters survive.
// Note: following a promotion link may register as a click in the AliExpress
// portal; the job therefore checks only a few links per day.

export type LinkStatus = "ok" | "wrong_product" | "not_aliexpress" | "broken";
export type LinkCheck = {
  status: LinkStatus;
  hops: number;
  finalHost: string | null;
  finalProductId: string | null;
  /** Names (never values) of affiliate parameters seen on the way, e.g. aff_fcid. */
  affParams: string[];
  detail: string | null;
};

const ALI = ["aliexpress.com", "aliexpress.us", "aliexpress.ru"];
const isAli = (host: string) => ALI.some((d) => host === d || host.endsWith("." + d));
const AFF_PARAM = /^(aff_[a-z_]+|sk|terminal_id|afSmartRedirect|src|algo_pvid|utparam-url|pdp_npi)$/i;

/** Product id in an AliExpress URL: /item/<id>.html, or productId/redirectUrl params. */
export function productIdFromUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const m = /\/item\/(\d{6,24})\.html/.exec(u.pathname) ?? /\/i\/(\d{6,24})\.html/.exec(u.pathname);
  if (m) return m[1];
  const pid = u.searchParams.get("productId") ?? u.searchParams.get("productIds");
  if (pid && /^\d{6,24}$/.test(pid)) return pid;
  // Some share/landing hops carry the destination in a parameter.
  for (const key of ["redirectUrl", "dl_target_url", "url"]) {
    const inner = u.searchParams.get(key);
    if (inner) {
      const id = productIdFromUrl(inner);
      if (id) return id;
    }
  }
  return null;
}

/** `body` (first few KB) is only needed for 200 pages that redirect by script or meta refresh. */
export type Fetcher = (url: string) => Promise<{ status: number; location: string | null; body?: string | null }>;

/** A product URL written into a 200 redirect page (meta refresh / script). */
export function productUrlInBody(body: string | null | undefined, preferId: string | null = null): string | null {
  if (!body) return null;
  // Prefer a link to the product we expect: the page may also list other products.
  if (preferId && /^\d{4,24}$/.test(preferId)) {
    const own = new RegExp(`https?:(?:\\\\?\\/){2}[a-z0-9.-]*aliexpress\\.(?:com|us|ru)(?:\\\\?\\/)+(?:item|i)(?:\\\\?\\/)${preferId}\\.html[^"'\\s<>]*`, "i").exec(body);
    if (own) return own[0].replace(/\\\//g, "/").replace(/&amp;/g, "&");
  }
  const m = /https?:(?:\\?\/){2}[a-z0-9.-]*aliexpress\.(?:com|us|ru)(?:\\?\/)+(?:item|i)(?:\\?\/)\d{6,24}\.html[^"'\s<>]*/i.exec(body);
  return m ? m[0].replace(/\\\//g, "/").replace(/&amp;/g, "&") : null;
}

export async function checkAffiliateLink(link: string, expectedId: string, fetcher: Fetcher, maxHops = 6): Promise<LinkCheck> {
  const aff = new Set<string>();
  let viaBody = false;
  const note = (url: URL) => url.searchParams.forEach((_, k) => AFF_PARAM.test(k) && aff.add(k));
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { status: "broken", hops: 0, finalHost: null, finalProductId: null, affParams: [], detail: "invalid URL" };
  }
  for (let hop = 0; hop <= maxHops; hop++) {
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !isAli(host))
      return { status: "not_aliexpress", hops: hop, finalHost: host, finalProductId: null, affParams: [...aff].sort(), detail: url.protocol + "//" + host };
    note(url);
    const id = productIdFromUrl(url.href);
    // Reaching a product URL is enough: the page itself is never loaded.
    if (id && hop > 0)
      return {
        // A mismatch seen only inside a page body is not conclusive (the page may list
        // other products): it is reported as unverifiable, never as a wrong product.
        status: id === expectedId ? "ok" : viaBody ? "broken" : "wrong_product",
        hops: hop,
        finalHost: host,
        finalProductId: id,
        affParams: [...aff].sort(),
        detail: id === expectedId ? null : viaBody ? `page mentions ${id}, not ${expectedId}; not conclusive` : `expected ${expectedId}, got ${id}`,
      };
    if (hop === maxHops) break;
    let res: { status: number; location: string | null; body?: string | null };
    try {
      res = await fetcher(url.href);
    } catch {
      return { status: "broken", hops: hop, finalHost: host, finalProductId: null, affParams: [...aff].sort(), detail: "network error or timeout" };
    }
    if (res.status >= 300 && res.status < 400 && res.location) {
      try {
        url = new URL(res.location, url);
      } catch {
        return { status: "broken", hops: hop + 1, finalHost: host, finalProductId: null, affParams: [...aff].sort(), detail: "invalid redirect" };
      }
      continue;
    }
    const inBody = res.status === 200 ? productUrlInBody(res.body, expectedId) : null;
    if (inBody) {
      viaBody = true;
      url = new URL(inBody);
      continue;
    }
    return {
      status: "broken",
      hops: hop + 1,
      finalHost: host,
      finalProductId: null,
      affParams: [...aff].sort(),
      detail: `HTTP ${res.status} before reaching a product page`,
    };
  }
  return { status: "broken", hops: maxHops, finalHost: url.hostname, finalProductId: null, affParams: [...aff].sort(), detail: "too many redirects" };
}
