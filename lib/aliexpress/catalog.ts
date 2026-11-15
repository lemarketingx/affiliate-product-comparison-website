import "server-only";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import {
  AffiliateError,
  configured,
  queryAffiliateProducts,
  queryAffiliateProductsPage,
  type AliProduct,
} from "./affiliate";
import { categories } from "../dealpilot/categories";
import { identifyListedBrand } from "../dealpilot/brands";
import { buildCatalog, type CatalogReport, type CatalogProduct, type PlanItem } from "./catalog-build";

export type CatalogItem = AliProduct & {
  category: string;
  categorySlug: string;
};
export type CatalogSnapshot = {
  items: CatalogItem[];
  fetchedAt: string | null;
  available: boolean;
  partial: boolean;
  qualityFiltered?: boolean;
  report?: CatalogReport;
  /** The catalog is being (re)built in the background; nothing is shown as missing. */
  warming?: boolean;
};

const NS = process.env.DEALPILOT_CACHE_NAMESPACE ?? "default";
const intEnv = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
};
/** Per-process ceiling on catalog provider calls per hour (deployment-wide quota is the provider's). */
const HOURLY_LIMIT = intEnv("DEALPILOT_CATALOG_HOURLY_LIMIT", 150, 1, 1000);
/** How long a visitor request waits for a catalog that is still being built. */
const WAIT_MS = intEnv("DEALPILOT_CATALOG_WAIT_MS", 2500, 0, 20000);

async function providerPage(term: string, pageNo: number, pageSize: number) {
  const page = await queryAffiliateProductsPage({
    keywords: term,
    pageNo,
    pageSize,
    guard: { key: "aliexpress-catalog", limit: HOURLY_LIMIT, periodMs: 3600000 },
  });
  return { ...page, fetchedAt: new Date().toISOString() };
}
// Staggered lifetimes so deeper pages do not all refresh in the same burst.
const pageCache = [21600, 28800, 36000].map((revalidate, i) =>
  unstable_cache(providerPage, ["dealpilot-catalog-brand-page-v1", "p" + (i + 1), NS], { revalidate }),
);
const fetchPlanPage = (item: PlanItem, pageSize: number) =>
  pageCache[Math.min(item.pageNo, pageCache.length) - 1](item.term, item.pageNo, pageSize);

let learnedPageSize: number | null = null;

async function assemble(): Promise<CatalogSnapshot> {
  const timestamps: string[] = [];
  const { items, report, acceptedPageSize } = await buildCatalog({
    categories,
    knownPageSize: learnedPageSize,
    fetchPage: async (item, size) => {
      const page = await fetchPlanPage(item, size);
      timestamps.push(page.fetchedAt);
      return page;
    },
  });
  if (acceptedPageSize) learnedPageSize = acceptedPageSize;
  return {
    items: items as CatalogProduct[],
    fetchedAt: timestamps.sort()[0] ?? null,
    available: report.pagesFetched > 0,
    partial: report.pagesPending > 0 || report.pagesFailed > 0,
    qualityFiltered: false,
    report,
  };
}

// The whole assembled catalog is one cache entry shared by all instances.
// After the first build, visitors always get it instantly (stale-while-revalidate);
// refreshes and provider calls happen in the background, never in a page view.
const cachedSnapshot = unstable_cache(assemble, ["dealpilot-brand-catalog-v1", NS], { revalidate: 21600 });

let memo: { at: number; snapshot: CatalogSnapshot } | null = null;
let inflight: Promise<CatalogSnapshot> | null = null;
const MEMO_MS = 60000;
const sleep = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms));

/**
 * Public catalog: >5000 reported sales, ILS, Hebrew title, valid product data
 * and a valid affiliate link. A page view waits at most WAIT_MS; if the catalog
 * is still being built it gets a "warming" snapshot and the build continues
 * after the response (next/server `after`).
 */
export async function getCatalog(options: { waitMs?: number } = {}): Promise<CatalogSnapshot> {
  if (!configured()) return { items: [], fetchedAt: null, available: false, partial: false, qualityFiltered: false };
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.snapshot;
  if (!inflight) {
    inflight = cachedSnapshot()
      .then((snapshot) => {
        memo = { at: Date.now(), snapshot };
        return snapshot;
      })
      .catch(() => ({ items: [], fetchedAt: null, available: false, partial: true, qualityFiltered: false }) as CatalogSnapshot)
      .finally(() => {
        inflight = null;
      });
  }
  const pending = inflight;
  const waitMs = Math.min(20000, Math.max(0, options.waitMs ?? WAIT_MS));
  const result = await Promise.race([pending, sleep(waitMs)]);
  if (result) return result;
  try {
    after(() => pending.then(() => undefined));
  } catch {
    // Outside a request scope (e.g. build): nothing to keep alive.
  }
  return { items: [], fetchedAt: null, available: true, partial: true, qualityFiltered: false, warming: true };
}

// Private discovery (admin): first page of the first term per category, unfiltered.
const fetchBatch = unstable_cache(
  async (term: string) => ({
    products: await queryAffiliateProducts(term, 10),
    fetchedAt: new Date().toISOString(),
  }),
  ["dealpilot-catalog-he-il-ils-v4", NS],
  { revalidate: 21600 },
);
export async function getDiscoveredCatalog(): Promise<CatalogSnapshot> {
  if (!configured())
    return { items: [], fetchedAt: null, available: false, partial: false };
  const responses = await Promise.allSettled(
    categories.map((c) => fetchBatch(c.term)),
  );
  const unique = new Map<string, CatalogItem>();
  const timestamps: string[] = [];
  responses.forEach((response) => {
    if (response.status === "fulfilled") timestamps.push(response.value.fetchedAt);
  });
  const maxRows = Math.max(0, ...responses.map((r) =>
    r.status === "fulfilled" ? r.value.products.length : 0,
  ));
  for (let row = 0; row < maxRows; row++) {
    responses.forEach((response, index) => {
      if (response.status !== "fulfilled") return;
      const product = response.value.products[row];
      if (!product || unique.has(product.id)) return;
      unique.set(product.id, {
        ...product,
        category: categories[index].label,
        categorySlug: categories[index].slug,
      });
    });
  }
  return {
    items: [...unique.values()].filter((p) => identifyListedBrand(p) !== null),
    fetchedAt: timestamps.sort()[0] ?? null,
    available: timestamps.length > 0,
    partial: timestamps.length > 0 && timestamps.length < categories.length,
  };
}
