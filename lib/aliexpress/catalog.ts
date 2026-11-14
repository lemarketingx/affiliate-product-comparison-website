import "server-only";
import { unstable_cache } from "next/cache";
import {
  configured,
  queryAffiliateProducts,
  type AliProduct,
} from "./affiliate";
import { categories } from "../dealpilot/categories";
import { evaluateEligibility } from "./quality";
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

export async function getCatalog(): Promise<CatalogSnapshot> {
  const snapshot = await getDiscoveredCatalog();
  return {
    ...snapshot,
    qualityFiltered: false,
    // Owner-authorized discovery mode: retain known purchase/core-data checks,
    // while missing quality evidence is disclosed on every public product.
    items: snapshot.items.filter((p) => {
      const { blockers } = evaluateEligibility(p);
      return p.currency === "ILS" && !blockers.some((code) =>
        ["orders", "hebrew", "product_data"].includes(code),
      );
    }),
  };
}
