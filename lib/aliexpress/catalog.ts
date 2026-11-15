import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { unstable_cache } from "next/cache";
import {
  AffiliateError,
  configured,
  queryAffiliateProducts,
  queryAffiliateProductsPage,
  type AliProduct,
} from "./affiliate";
import { categories } from "../dealpilot/categories";
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
};

const NS = process.env.DEALPILOT_CACHE_NAMESPACE ?? "default";
const intEnv = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
};
/** Uncached provider calls one visitor request may trigger. Cached pages are free. */
const REQUEST_BUDGET = intEnv("DEALPILOT_CATALOG_REQUEST_BUDGET", 12, 0, 200);
/** Per-process ceiling on catalog provider calls per hour (deployment-wide quota is the provider's). */
const HOURLY_LIMIT = intEnv("DEALPILOT_CATALOG_HOURLY_LIMIT", 150, 1, 1000);

// Request-scoped budget, visible inside unstable_cache misses (same async context).
const budget = new AsyncLocalStorage<{ remaining: number }>();

async function providerPage(term: string, pageNo: number, pageSize: number) {
  const state = budget.getStore();
  if (state) {
    if (state.remaining <= 0) throw new AffiliateError("CATALOG_DEFERRED", 503);
    state.remaining--;
  }
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
  unstable_cache(providerPage, ["dealpilot-catalog-page-v5", "p" + (i + 1), NS], { revalidate }),
);
const fetchPlanPage = (item: PlanItem, pageSize: number) =>
  pageCache[Math.min(item.pageNo, pageCache.length) - 1](item.term, item.pageNo, pageSize);

let learnedPageSize: number | null = null;
let memo: { at: number; snapshot: CatalogSnapshot } | null = null;
let inflight: Promise<CatalogSnapshot> | null = null;
const MEMO_MS = 60000;

async function assemble(): Promise<CatalogSnapshot> {
  const timestamps: string[] = [];
  const { items, report, acceptedPageSize } = await budget.run({ remaining: REQUEST_BUDGET }, () =>
    buildCatalog({
      categories,
      knownPageSize: learnedPageSize,
      fetchPage: async (item, size) => {
        const page = await fetchPlanPage(item, size);
        timestamps.push(page.fetchedAt);
        return page;
      },
    }),
  );
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

/**
 * Public catalog: >5000 reported sales, ILS, Hebrew title, valid product data
 * and a valid affiliate link. Built in stages from cached provider pages; a
 * visitor request never triggers more than REQUEST_BUDGET new provider calls.
 */
export async function getCatalog(): Promise<CatalogSnapshot> {
  if (!configured()) return { items: [], fetchedAt: null, available: false, partial: false, qualityFiltered: false };
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.snapshot;
  inflight ??= assemble()
    .then((snapshot) => {
      // Keep complete snapshots for the memo window; retry partial ones sooner.
      memo = { at: snapshot.partial ? now - MEMO_MS + 5000 : now, snapshot };
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
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
    items: [...unique.values()],
    fetchedAt: timestamps.sort()[0] ?? null,
    available: timestamps.length > 0,
    partial: timestamps.length > 0 && timestamps.length < categories.length,
  };
}
