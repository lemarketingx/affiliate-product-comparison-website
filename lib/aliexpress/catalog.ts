import "server-only";
import { unstable_cache } from "next/cache";
import { queryAffiliateProducts, type AliProduct } from "./affiliate";

export type CatalogItem = AliProduct & { category: "בית וסדר" | "רכב ואביזרים" };
export type CatalogSnapshot = { items: CatalogItem[]; fetchedAt: string; available: boolean };

// Two fixed search terms, not visitor-controlled API requests.
// Successful batches are cached by Next.js for six hours to protect the affiliate quota.
const fetchBatch = unstable_cache(async (term: string) => {
  return queryAffiliateProducts(term,10);
}, ["dealpilot-catalog-v1"], { revalidate: 21600 });

export async function getCatalog(): Promise<CatalogSnapshot> {
  const terms = [
    { term: "home organizer", category: "בית וסדר" as const },
    { term: "car accessories", category: "רכב ואביזרים" as const },
  ];
  const responses = await Promise.allSettled(terms.map(({term}) => fetchBatch(term)));
  const unique = new Map<string,CatalogItem>();
  responses.forEach((response,index) => {
    if (response.status !== "fulfilled") return;
    response.value.forEach(product => {
      if (!unique.has(product.id)) unique.set(product.id,{...product,category:terms[index].category});
    });
  });
  return {
    items:Array.from(unique.values()),
    fetchedAt: new Date().toISOString(),
    available: responses.some(response => response.status === "fulfilled"),
  };
}
