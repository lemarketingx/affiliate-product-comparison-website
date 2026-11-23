// The ONE public origin used for canonical links, Open Graph URLs, robots and
// the sitemap. Never the per-deployment VERCEL_URL: on 2026-11-23 every
// production canonical pointed at "…-13yelf8q1.vercel.app", a deployment
// address, so search engines were told the real pages were duplicates.
// Set DEALPILOT_SITE_URL when the site moves to its own domain.
export const PRODUCTION_ORIGIN = "https://affiliate-product-comparison-websit.vercel.app";

export function siteOrigin(env: Record<string, string | undefined> = process.env): string {
  const raw = env.DEALPILOT_SITE_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && !u.pathname.replace(/\/+$/, "") && !u.search && !u.hash) return u.origin;
    } catch {
      // Invalid value: fall through to the known production origin.
    }
  }
  return PRODUCTION_ORIGIN;
}
