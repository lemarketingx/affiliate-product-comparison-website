import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { allowRequest } from "../dealpilot/rate-limit";
import { unknownQuality, type QualityEvidence } from "./quality";
import {
  AffiliateError,
  parsePageMeta,
  validateProductQuery,
  type ProductPage,
  type ProductQuery,
} from "./query";
export { AffiliateError, PAGE_NO_LIMIT, PAGE_SIZE_LIMIT, validateProductQuery } from "./query";
export type { PageMeta, ProductPage, ProductQuery } from "./query";

const GATEWAY = "https://api-sg.aliexpress.com/sync";
const METHOD = "aliexpress.affiliate.product.query";

export type AliProduct = {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  image: string | null;
  productUrl: string | null;
  affiliateUrl: string | null;
  commissionRate: string | null;
  orders: number | null;
  shipTo: null;
  requestedCountry: "IL";
  titleLanguage: "he" | "source";
  images: string[];
  shopName: string | null;
  supplierBrand: string | null;
  positiveFeedbackPercent: number | null;
  quality: QualityEvidence;
};

type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}
function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
function safeUrl(
  value: unknown,
  kind: "image" | "product" | "affiliate",
): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const hostname = u.hostname.toLowerCase();
    const allowed =
      kind === "image"
        ? ["alicdn.com", "aliexpress-media.com", "aliexpress.com"]
        : kind === "affiliate"
          ? ["aliexpress.com", "aliexpress.us", "s.click.aliexpress.com"]
          : ["aliexpress.com", "aliexpress.us"];
    if (
      !allowed.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain),
      )
    )
      return null;
    u.username = "";
    u.password = "";
    return u.toString();
  } catch {
    return null;
  }
}
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


export function normalizeProductResponse(payload: unknown): AliProduct[] {
  const root = record(payload);
  if (!root) throw new AffiliateError("INVALID_RESPONSE");
  const error = record(root.error_response);
  if (error) {
    const code = text(error.code) ?? "UNKNOWN";
    // Do not forward provider error text (which may contain request details).
    throw new AffiliateError(
      "PROVIDER_ERROR_" + code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32),
    );
  }
  const response = record(root.aliexpress_affiliate_product_query_response);
  if (!response) throw new AffiliateError("UNEXPECTED_RESPONSE_SHAPE");
  const dto = record(response.resp_result);
  if (!dto) throw new AffiliateError("MISSING_RESULT");
  const providerCode = text(dto.resp_code);
  if (providerCode !== "200") {
    const message = (text(dto.resp_msg) ?? "").toLowerCase();
    const hint = /parameter|param|invalid|illegal|错误|参数/.test(message)
      ? "_INVALID_PARAMETER"
      : /permission|access|authorize|权限|授权/.test(message)
        ? "_PERMISSION"
        : /track/.test(message)
          ? "_TRACKING"
          : "";
    throw new AffiliateError(
      "PROVIDER_RESULT_" +
        (providerCode ?? "UNKNOWN").replace(/[^a-zA-Z0-9_-]/g, "") +
        hint,
    );
  }
  const result = record(dto.result);
  const wrapper = result ? record(result.products) : null;
  const rows = wrapper?.product;
  const items = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return items
    .map((row) => {
      const p = record(row);
      if (!p) return null;
      const id = text(p.product_id);
      const title = text(p.product_title);
      if (!id || !/^\d{4,24}$/.test(id) || !title) return null;
      // Keep amount and currency from the same provider quote. Never label a
      // fallback USD amount as ILS because only one target field was returned.
      const targetPrice = text(p.target_sale_price);
      const targetCurrency = text(p.target_sale_price_currency);
      const useTarget = Boolean(targetPrice && targetCurrency);
      const price = useTarget ? targetPrice : text(p.sale_price);
      const currency = useTarget ? targetCurrency : text(p.sale_price_currency);
      const image = safeUrl(p.product_main_image_url, "image");
      const productUrl = safeUrl(p.product_detail_url, "product");
      // Do not confuse a product URL with an affiliate URL.
      const promotionUrl = safeUrl(p.promotion_link, "affiliate");
      const affiliateUrl =
        promotionUrl && promotionUrl !== productUrl ? promotionUrl : null;
      const orders = Number(p.lastest_volume);
      const smallImages = record(p.product_small_image_urls)?.string;
      const images = [
        ...new Set(
          [
            image,
            ...(Array.isArray(smallImages) ? smallImages : [smallImages]).map(
              (value) => safeUrl(value, "image"),
            ),
          ].filter((url): url is string => Boolean(url)),
        ),
      ].slice(0, 8);
      const rate = text(p.evaluate_rate);
      const parsedRate =
        rate && /^\d{1,3}(?:\.\d+)?%$/.test(rate)
          ? Number(rate.slice(0, -1))
          : NaN;
      return {
        id,
        title,
        price,
        currency,
        image,
        productUrl,
        affiliateUrl,
        commissionRate: text(p.commission_rate),
        orders:
          p.lastest_volume == null ||
          p.lastest_volume === "" ||
          !Number.isFinite(orders) ||
          orders < 0
            ? null
            : Math.floor(orders),
        shipTo: null,
        requestedCountry: "IL" as const,
        titleLanguage: /[\u0590-\u05ff]/.test(title)
          ? ("he" as const)
          : ("source" as const),
        images,
        shopName: text(p.shop_name),
        supplierBrand: text(p.brand_name) ?? text(p.brand),
        positiveFeedbackPercent:
          Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 100
            ? parsedRate
            : null,
        // The affiliate response does not prove average stars, buyer countries
        // or available delivery. Do not trust similarly named raw fields.
        quality: unknownQuality(),
      };
    })
    .filter((p): p is AliProduct => p !== null);
}

/** Products plus the provider's paging counters (when returned). */
export function parseProductPage(payload: unknown, pageNo: number, pageSize: number): ProductPage {
  return { products: normalizeProductResponse(payload), meta: parsePageMeta(payload, pageNo, pageSize) };
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
