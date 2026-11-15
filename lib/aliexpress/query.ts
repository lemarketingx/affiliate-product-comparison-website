// Pure, framework-free helpers for the affiliate product query (unit-testable).
export class AffiliateError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number = 502) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

// Documented as 1–50 by third-party SDK descriptions of
// aliexpress.affiliate.product.query; the catalog builder verifies the value
// at runtime and falls back to smaller sizes if the provider rejects it.
export const PAGE_SIZE_LIMIT = 50;
export const PAGE_NO_LIMIT = 100;

export type ProductQuery = {
  keywords: string;
  pageNo?: number;
  pageSize?: number;
  /** Per-process flood guard bucket; defaults to the interactive budget. */
  guard?: { key: string; limit: number; periodMs: number };
};
export type PageMeta = {
  pageNo: number;
  pageSize: number;
  currentRecordCount: number | null;
  totalRecordCount: number | null;
};
// Kept structural so this module does not depend on the server-only normalizer.
export type ProductPage<P = import("./affiliate").AliProduct> = { products: P[]; meta: PageMeta };

/** Validates and normalises query input. Throws AffiliateError(400) on bad input. */
export function validateProductQuery(q: ProductQuery): { keywords: string; pageNo: number; pageSize: number } {
  const keywords = typeof q.keywords === "string" ? q.keywords.replace(/\s+/g, " ").trim() : "";
  if (keywords.length < 2 || keywords.length > 120 || /[\u0000-\u001f\u007f]/.test(keywords))
    throw new AffiliateError("INVALID_KEYWORDS", 400);
  const pageNo = q.pageNo ?? 1;
  if (!Number.isSafeInteger(pageNo) || pageNo < 1 || pageNo > PAGE_NO_LIMIT)
    throw new AffiliateError("INVALID_PAGE_NO", 400);
  const pageSize = q.pageSize ?? 10;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE_LIMIT)
    throw new AffiliateError("INVALID_PAGE_SIZE", 400);
  return { keywords, pageNo, pageSize };
}

const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
function count(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
/** The provider's paging counters, when returned. Unknown stays null, never 0. */
export function parsePageMeta(payload: unknown, pageNo: number, pageSize: number): PageMeta {
  const result = rec(rec(rec(rec(payload)?.aliexpress_affiliate_product_query_response)?.resp_result)?.result);
  return {
    pageNo,
    pageSize,
    currentRecordCount: count(result?.current_record_count),
    totalRecordCount: count(result?.total_record_count),
  };
}
