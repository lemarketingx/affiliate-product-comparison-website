/**
 * Display rules for seller-written listing data. Pure: no I/O.
 *
 * Sellers write titles and pick search terms; neither is verified. These rules
 * remove seller claims we cannot back (sale/"top sale" banners) and stop a
 * search term from putting a product in a category its title does not support.
 */
import { categories } from "./categories.ts";

// A bracketed or leading seller banner that claims a sale, a deal or popularity.
const PROMO_WORDS = /(sale|deal|hot|top|best|new|offer|promo|discount|clearance|flash|מבצע|הנחה|חדש|לוהט|הכי נמכר|רב מכר|מומלץ)/i;
const BRACKETED = /[【\[]([^【】\[\]]{1,30})[】\]]/g;
const LEADING = /^\s*(?:מבצע(?:\s+חדש)?|הנחה|מחיר מבצע|hot\s*sale|big\s*sale|top\s*sale|new\s*arrival|flash\s*deal)\s*[:：!\-–—|]*\s*/i;

/** Removes seller promo banners ("מבצע חדש:", "【Top Sale】"); keeps descriptive brackets. */
export function cleanListingTitle(title: string): string {
  let t = title.replace(BRACKETED, (whole, inner: string) => (PROMO_WORDS.test(inner) ? " " : whole));
  for (let i = 0; i < 2; i++) t = t.replace(LEADING, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t.length >= 8 ? t : title.trim();
}

// The car category comes from search terms such as "Baseus car", which also
// return wall chargers and power banks. A product stays in "car" only when its
// title says it is for a car.
const CAR_WORDS = /(רכב|מכונית|מצלמת דרך|צמיג|משאבת אוויר|\b(?:dash\s*cam|dashcam|car|cars|vehicle|automotive|tire|tyre|inflator)\b)/i;

export function resolveCategory(title: string, slug: string, brandCategory: string | null | undefined): { slug: string; label: string } | null {
  // Car-first brands (70mai, VIOFO, DDPAI) stay in car; only multi-category brands move.
  if (slug !== "car" || brandCategory === "car" || CAR_WORDS.test(title)) return null;
  const target = categories.find((c) => c.slug === (brandCategory || "tech"));
  return target ? { slug: target.slug, label: target.label } : null;
}
