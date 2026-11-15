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
import { shelfFor } from "../dealpilot/shelves";
import { brandSearchTerms } from "../dealpilot/brand-search";
export type CatalogItem = AliProduct & {
  category: string;
  categorySlug: string;
  /* Brand catalog only: the brand slug equals categorySlug. */
  storeStatus?: StoreStatus;
  /* Cross-brand shopping category, see lib/dealpilot/shelves.ts. */
  shelf?: string;
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

/**
 * Cache each query/page independently. The first refresh can use up to
 * 12 brands × 4 terms × 2 pages = 96 calls. This is provider-dependent;
 * a quota error is reflected as partial results, not disguised as inventory.
 */
const fetchBrandPage = unstable_cache(
  async (term: string, page: number) =>
    ({products:await queryAffiliateProducts(term,50,page),fetchedAt:new Date().toISOString()}),
  ["dealpilot-brand-pages-v2",process.env.DEALPILOT_CACHE_NAMESPACE??"default"],
  {revalidate:21600},
);
const fetchBrandBatch = async (slug:string,primary:string) => {
  const terms=brandSearchTerms(slug,primary);
  const requests=terms.flatMap(term=>[1,2].map(page=>({term,page})));
  const results=await Promise.allSettled(requests.map(x=>fetchBrandPage(x.term,x.page)));
  const unique=new Map<string,AliProduct>();
  let incomplete=false;
  const timestamps:string[]=[];
  for(const r of results){
    if(r.status!=="fulfilled"){incomplete=true;continue;}
    timestamps.push(r.value.fetchedAt);
    for(const p of r.value.products) if(!unique.has(p.id)) unique.set(p.id,p);
  }
  return {products:[...unique.values()],incomplete,fetchedAt:timestamps.sort()[0]??new Date().toISOString()};
};

/* Public storefront: known brands only, and only products whose shop name
   identifies the brand's official store. Everything else is dropped. */
export async function getCatalog(): Promise<CatalogSnapshot> {
  if (!configured())
    return { items: [], fetchedAt: null, available: false, partial: false, qualityFiltered: false };
  const responses = await Promise.allSettled(
    brands.map((b) => fetchBrandBatch(b.slug,b.term)),
  );
  const unique = new Map<string, CatalogItem>();
  const timestamps: string[] = [];
  let queryPartial = false;
  responses.forEach((r) => {
    if (r.status !== "fulfilled" || r.value.incomplete) queryPartial = true;
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
      if (!product.title.toLowerCase().includes(brand.name.toLowerCase()) && !brand.storeVerified) return;
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
        shelf: shelfFor(product.title),
      });
    });
  }
  return {
    items: [...unique.values()],
    fetchedAt: timestamps.sort()[0] ?? null,
    available: timestamps.length > 0,
    partial: queryPartial || (timestamps.length > 0 && timestamps.length < brands.length),
    qualityFiltered: false,
  };
}
