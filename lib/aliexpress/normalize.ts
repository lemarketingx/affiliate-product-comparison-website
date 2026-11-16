// Pure, framework-free normalisation of AliExpress affiliate product payloads
// (product.query and productdetail.get share the product row shape).
// No "server-only" import so the import pipeline and unit tests can use it.
import { unknownQuality, type QualityEvidence } from "./quality.ts";
import { AffiliateError, parsePageMeta, type ProductPage } from "./query.ts";

/**
 * Every price field the provider returned for this row, verbatim. Kept so the
 * price-gap dashboard can show which field was used and how the others differ.
 * `sku_id` is the variant these prices belong to (the provider does not say
 * which variant a shopper will land on).
 */
export type PriceFields = {
  skuId: string | null;
  salePrice: string | null;
  salePriceCurrency: string | null;
  targetSalePrice: string | null;
  targetSalePriceCurrency: string | null;
  appSalePrice: string | null;
  appSalePriceCurrency: string | null;
  targetAppSalePrice: string | null;
  targetAppSalePriceCurrency: string | null;
  originalPrice: string | null;
  originalPriceCurrency: string | null;
  targetOriginalPrice: string | null;
  targetOriginalPriceCurrency: string | null;
  discount: string | null;
};

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
  /** Which provider field `price` came from. */
  priceField: "target_sale_price" | "sale_price" | null;
  priceFields: PriceFields;
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
export function safeUrl(
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
export const PRODUCT_QUERY_ROOT = "aliexpress_affiliate_product_query_response";
export const PRODUCT_DETAIL_ROOT = "aliexpress_affiliate_productdetail_get_response";

export function priceFieldsOf(p: JsonRecord): PriceFields {
  return {
    skuId: text(p.sku_id),
    salePrice: text(p.sale_price),
    salePriceCurrency: text(p.sale_price_currency),
    targetSalePrice: text(p.target_sale_price),
    targetSalePriceCurrency: text(p.target_sale_price_currency),
    appSalePrice: text(p.app_sale_price),
    appSalePriceCurrency: text(p.app_sale_price_currency),
    targetAppSalePrice: text(p.target_app_sale_price),
    targetAppSalePriceCurrency: text(p.target_app_sale_price_currency),
    originalPrice: text(p.original_price),
    originalPriceCurrency: text(p.original_price_currency),
    targetOriginalPrice: text(p.target_original_price),
    targetOriginalPriceCurrency: text(p.target_original_price_currency),
    discount: text(p.discount),
  };
}

export function normalizeProductResponse(payload: unknown, rootKey: string = PRODUCT_QUERY_ROOT): AliProduct[] {
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
  const response = record(root[rootKey]);
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
        priceField: price ? (useTarget ? ("target_sale_price" as const) : ("sale_price" as const)) : null,
        priceFields: priceFieldsOf(p),
      };
    })
    .filter((p): p is AliProduct => p !== null);
}

/** Products plus the provider's paging counters (when returned). */
export function parseProductPage(payload: unknown, pageNo: number, pageSize: number): ProductPage {
  return { products: normalizeProductResponse(payload), meta: parsePageMeta(payload, pageNo, pageSize) };
}

