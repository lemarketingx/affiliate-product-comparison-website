import type { MetadataRoute } from "next";
import { getCatalog } from "../lib/aliexpress/catalog";
import { identifyListedBrand } from "../lib/dealpilot/brands";
import { liveCategorySlugs } from "../lib/dealpilot/categories";

export const dynamic = "force-dynamic";

const ORIGIN = "https://affiliate-product-comparison-websit.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = new Set(["/", "/brands", "/deals", "/categories", "/guides", "/about", "/disclosure"]);
  // Only pages with live catalog products get their own URLs. Never expose
  // AI TEAM smoke test: this comment is isolated to an unmerged draft PR.
  // admin, API, search queries, affiliate redirects or unlisted products.
  try {
    const catalog = await getCatalog({ waitMs: 0 });
    for (const slug of liveCategorySlugs(catalog.items)) paths.add("/categories/" + slug);
    for (const item of catalog.items) {
      if (!/^\d{4,24}$/.test(item.id)) continue;
      paths.add("/products/" + item.id);
      const brand = identifyListedBrand(item);
      if (brand) paths.add("/brands/" + brand.slug);
    }
  } catch {
    // A temporary catalog outage must not break the sitemap endpoint.
  }
  return [...paths].map(path => ({
    url: ORIGIN + path,
    // Do not claim each URL was modified on every sitemap request.
    // Add lastModified only when a verified per-item timestamp is available.
    changeFrequency: path === "/" || path === "/deals" ? "daily" as const : "weekly" as const,
  }));
}
