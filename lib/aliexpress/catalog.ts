import "server-only";
import { unstable_cache } from "next/cache";
import {
  configured,
  queryAffiliateProducts,
  type AliProduct,
} from "./affiliate";
import { categories } from "../dealpilot/categories";
export type CatalogItem = AliProduct & {
  category: string;
  categorySlug: string;
};
export type CatalogSnapshot = {
  items: CatalogItem[];
  fetchedAt: string | null;
  available: boolean;
  partial: boolean;
};
const fetchBatch = unstable_cache(
  async (term: string) => ({
    products: await queryAffiliateProducts(term, 10),
    fetchedAt: new Date().toISOString(),
  }),
  ["dealpilot-catalog-v2", process.env.DEALPILOT_CACHE_NAMESPACE ?? "default"],
  { revalidate: 21600 },
);
export async function getCatalog(): Promise<CatalogSnapshot> {
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
    response.value.products.forEach((product) => {
      if (!unique.has(product.id))
        unique.set(product.id, {
          ...product,
          category: categories[index].label,
          categorySlug: categories[index].slug,
        });
    });
  });
  return {
    items: [...unique.values()],
    fetchedAt: timestamps.sort()[0] ?? null,
    available: timestamps.length > 0,
    partial: timestamps.length > 0 && timestamps.length < categories.length,
  };
}
