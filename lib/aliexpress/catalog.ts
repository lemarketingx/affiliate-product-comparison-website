import "server-only";
import { unstable_cache } from "next/cache";
import {
  configured,
  queryAffiliateProducts,
  type AliProduct,
} from "./affiliate";
import { categories } from "../dealpilot/categories";
import { evaluateEligibility } from "./quality";
import { brands, storeStatus, type StoreStatus } from "../dealpilot/brands";
export type CatalogItem = AliProduct & {
  category: string;
  categorySlug: string;
  /* Brand catalog only: the brand slug equals categorySlug. */
  storeStatus?: StoreStatus;
};
export type CatalogSnapshot = {
  items: CatalogItem[];
  fetchedAt: string | null;
  available: boolean;
  partial: boolean;
  qualityFiltered?: boolean;
};
const fetchBatch = unstable_cache(
  async (term: string) => ({
    products: await queryAffiliateProducts(term, 10),
    fetchedAt: new Date().toISOString(),
  }),
  [
    "dealpilot-catalog-he-il-ils-v4",
    process.env.DEALPILOT_CACHE_NAMESPACE ?? "default",
  ],
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
  responses.forEach((response, index) => {
    if (response.status !== "fulfilled") return;
    timestamps.push(response.value.fetchedAt);
  });
  // Interleave categories so one high-volume query cannot fill the first screen.
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

const fetchBrandBatch = unstable_cache(
  async (term: string) => ({
    products: await queryAffiliateProducts(term, 20),
    fetchedAt: new Date().toISOString(),
  }),
  [
    "dealpilot-brand-catalog-he-il-ils-v1",
    process.env.DEALPILOT_CACHE_NAMESPACE ?? "default",
  ],
  { revalidate: 21600 },
);

/* Public storefront: known brands only, and only products whose shop name
   identifies the brand's official store. Everything else is dropped. */
export async function getCatalog(): Promise<CatalogSnapshot> {
  if (!configured())
    return { items: [], fetchedAt: null, available: false, partial: false, qualityFiltered: false };
  const responses = await Promise.allSettled(
    brands.map((b) => fetchBrandBatch(b.term)),
  );
  const unique = new Map<string, CatalogItem>();
  const timestamps: string[] = [];
  responses.forEach((r) => {
    if (r.status === "fulfilled") timestamps.push(r.value.fetchedAt);
  });
  const maxRows = Math.max(0, ...responses.map((r) =>
    r.status === "fulfilled" ? r.value.products.length : 0,
  ));
  for (let row = 0; row < maxRows; row++) {
    responses.forEach((r, index) => {
      if (r.status !== "fulfilled") return;
      const product = r.value.products[row];
      if (!product || unique.has(product.id)) return;
      const brand = brands[index];
      const status = storeStatus(brand, product.shopName);
      if (status === "none") return;
      const { blockers } = evaluateEligibility(product);
      if (
        product.currency !== "ILS" ||
        blockers.some((code) => ["orders", "hebrew", "product_data"].includes(code))
      )
        return;
      unique.set(product.id, {
        ...product,
        category: brand.name,
        categorySlug: brand.slug,
        storeStatus: status,
      });
    });
  }
  return {
    items: [...unique.values()],
    fetchedAt: timestamps.sort()[0] ?? null,
    available: timestamps.length > 0,
    partial: timestamps.length > 0 && timestamps.length < brands.length,
    qualityFiltered: false,
  };
}
