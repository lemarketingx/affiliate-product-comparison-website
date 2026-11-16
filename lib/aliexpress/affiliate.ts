import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { allowRequest } from "../dealpilot/rate-limit";
import {
  AffiliateError,
  validateProductQuery,
  type ProductPage,
  type ProductQuery,
} from "./query";
import { normalizeProductResponse as normalizeRows, parseProductPage, PRODUCT_DETAIL_ROOT as DETAIL_ROOT, type AliProduct } from "./normalize";
const normalizeDetail = (json: unknown) => normalizeRows(json, DETAIL_ROOT);
export { normalizeProductResponse, parseProductPage, PRODUCT_DETAIL_ROOT } from "./normalize";
export type { AliProduct, PriceFields } from "./normalize";
export { AffiliateError, PAGE_NO_LIMIT, PAGE_SIZE_LIMIT, validateProductQuery } from "./query";
export type { PageMeta, ProductPage, ProductQuery } from "./query";

const GATEWAY = "https://api-sg.aliexpress.com/sync";
const METHOD = "aliexpress.affiliate.product.query";

function timestampChina() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}
export function signAffiliateParams(
  params: Record<string, string>,
  secret: string,
) {
  const signatureBase = Object.entries(params)
    .filter(([key]) => key !== "sign")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => key + value)
    .join("");
  return createHmac("md5", secret)
    .update(signatureBase, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function configured() {
  return Boolean(
    process.env.ALIEXPRESS_APP_KEY?.trim() &&
      process.env.ALIEXPRESS_APP_SECRET?.trim(),
  );
}
export function adminReady() {
  return Boolean(
    process.env.DEALPILOT_ADMIN_TOKEN &&
      process.env.DEALPILOT_ADMIN_TOKEN.length >= 24,
  );
}
export function validAdminToken(candidate: string | null): boolean {
  const expected = process.env.DEALPILOT_ADMIN_TOKEN;
  if (!expected || expected.length < 24 || !candidate) return false;
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}


export async function queryAffiliateProductsPage(query: ProductQuery): Promise<ProductPage> {
  const { keywords, pageNo, pageSize } = validateProductQuery(query);
  const key = process.env.ALIEXPRESS_APP_KEY?.trim();
  const secret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  if (!key || !secret) throw new AffiliateError("CREDENTIALS_MISSING", 503);
  const guard = query.guard ?? { key: "aliexpress-products", limit: 24, periodMs: 3600000 };
  if (!allowRequest(guard.key, guard.limit, guard.periodMs))
    throw new AffiliateError("PROVIDER_QUOTA_GUARD", 429);
  const params: Record<string, string> = {
    app_key: key,
    method: METHOD,
    sign_method: "hmac",
    format: "json",
    v: "2.0",
    timestamp: timestampChina(),
    keywords,
    page_no: String(pageNo),
    page_size: String(pageSize),
    // Prefer products with the highest reported recent sales.
    sort: "LAST_VOLUME_DESC",
    ship_to_country: "IL",
    target_language: "HE",
    target_currency: "ILS",
  };
  // Each option, then their combination, passed the bounded live Preview probe
  // on 2026-11-14. Country-specific search is not delivery verification.
  params.sign = signAffiliateParams(params, secret);
  let resp: Response;
  try {
    resp = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams(params),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AffiliateError("PROVIDER_UNREACHABLE", 503);
  }
  if (!resp.ok) throw new AffiliateError("PROVIDER_HTTP_" + resp.status);
  let json: unknown;
  try {
    json = await resp.json();
  } catch {
    throw new AffiliateError("INVALID_JSON");
  }
  return parseProductPage(json, pageNo, pageSize);
}

export async function queryAffiliateProducts(
  keywords: string,
  pageSize = 10,
  pageNo = 1,
): Promise<AliProduct[]> {
  return (await queryAffiliateProductsPage({ keywords, pageSize, pageNo })).products;
}

/**
 * Signed call to any affiliate method (featured promos, link generation...).
 * Returns the raw JSON; callers parse it with the pure helpers in promo-parse.ts.
 * Transport and HTTP failures become AffiliateError codes, never provider text.
 */
export async function callAffiliateMethod(
  method: string,
  extra: Record<string, string>,
  guard: { key: string; limit: number; periodMs: number },
): Promise<unknown> {
  if (!/^aliexpress\.affiliate\.[a-z.]+$/.test(method)) throw new AffiliateError("INVALID_METHOD", 400);
  const key = process.env.ALIEXPRESS_APP_KEY?.trim();
  const secret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  if (!key || !secret) throw new AffiliateError("CREDENTIALS_MISSING", 503);
  if (!allowRequest(guard.key, guard.limit, guard.periodMs))
    throw new AffiliateError("PROVIDER_QUOTA_GUARD", 429);
  const params: Record<string, string> = {
    app_key: key,
    method,
    sign_method: "hmac",
    format: "json",
    v: "2.0",
    timestamp: timestampChina(),
    ...extra,
  };
  params.sign = signAffiliateParams(params, secret);
  let resp: Response;
  try {
    resp = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(params),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AffiliateError("PROVIDER_UNREACHABLE", 503);
  }
  if (!resp.ok) throw new AffiliateError("PROVIDER_HTTP_" + resp.status);
  try {
    return await resp.json();
  } catch {
    throw new AffiliateError("INVALID_JSON");
  }
}

/** product_ids per productdetail.get call (documented maximum is 20). */
export const DETAIL_BATCH_LIMIT = 20;

/**
 * Product-ID-specific price check via aliexpress.affiliate.productdetail.get.
 * `country=IL` is the parameter that succeeded in the 2026-11-14 live probe
 * (docs/ALIEXPRESS-QUALITY.md). Only the job runner calls this, under a budget;
 * page views never do. Ids missing from the answer are returned as `missing`.
 */
export async function queryProductDetails(
  ids: string[],
  guard: { key: string; limit: number; periodMs: number },
): Promise<{ products: AliProduct[]; missing: string[] }> {
  const clean = [...new Set(ids.filter((id) => /^\d{4,24}$/.test(id)))].slice(0, DETAIL_BATCH_LIMIT);
  if (!clean.length) return { products: [], missing: [] };
  const extra: Record<string, string> = {
    product_ids: clean.join(","),
    country: "IL",
    // The product-detail API's documented currency allowlist does not include ILS.
    // Unlike product.query, detail.get can reject ILS with INVALID_PARAMETER (402).
    // Keep the provider-returned USD price/currency paired; never relabel as ILS.
    target_currency: "USD",
    target_language: "HE",
  };
  const tracking = process.env.ALIEXPRESS_TRACKING_ID?.trim();
  if (tracking) extra.tracking_id = tracking;
  const json = await callAffiliateMethod("aliexpress.affiliate.productdetail.get", extra, guard);
  const products = normalizeDetail(json);
  const got = new Set(products.map((p) => p.id));
  return { products, missing: clean.filter((id) => !got.has(id)) };
}
