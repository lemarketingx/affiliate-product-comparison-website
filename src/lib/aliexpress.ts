import "server-only";

import crypto from "node:crypto";

const DEFAULT_API_URL = "https://api-sg.aliexpress.com/sync";
const API_VERSION = "2.0";
const SIGN_METHOD = "md5";
const DEFAULT_TIMEOUT_MS = 10_000;

export const ALIEXPRESS_METHODS = {
  PRODUCT_SEARCH: "aliexpress.affiliate.product.query",
  HOT_PRODUCTS: "aliexpress.affiliate.hotproduct.query",
  PRODUCT_DETAILS: "aliexpress.affiliate.productdetail.get",
  GENERATE_LINK: "aliexpress.affiliate.link.generate",
} as const;

type AliExpressMethod = (typeof ALIEXPRESS_METHODS)[keyof typeof ALIEXPRESS_METHODS];
type AliExpressParams = Record<string, string | number | boolean | undefined | null>;
type UnknownRecord = Record<string, unknown>;

export type NormalizedProduct = {
  id: string | null;
  title: string | null;
  image: string | null;
  price: string | null;
  originalPrice: string | null;
  rating: string | null;
  orders: number | null;
  productUrl: string | null;
  affiliateUrl: string | null;
};

export type NormalizedAffiliateLink = {
  productUrl: string | null;
  affiliateUrl: string;
};

export type AliExpressTransport = "POST_FORM" | "GET_QUERY";

export class AliExpressError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "AliExpressError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "ALIEXPRESS_ERROR";
    this.details = options.details;
  }
}

export function getAliExpressConfig() {
  const appKey = process.env.ALIEXPRESS_APP_KEY?.trim();
  const appSecret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID?.trim();
  const apiUrl = process.env.ALIEXPRESS_API_URL?.trim() || DEFAULT_API_URL;
  const missing = [
    ["ALIEXPRESS_APP_KEY", appKey],
    ["ALIEXPRESS_APP_SECRET", appSecret],
    ["ALIEXPRESS_TRACKING_ID", trackingId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new AliExpressError("חסרה הגדרת AliExpress בשרת. בדקו את משתני הסביבה ב-Vercel.", {
      status: 503,
      code: "ALIEXPRESS_CONFIG_MISSING",
      details: { missing },
    });
  }

  return {
    appKey: appKey as string,
    appSecret: appSecret as string,
    trackingId: trackingId as string,
    apiUrl,
  };
}

export function signAliExpressRequest(params: AliExpressParams, appSecret: string) {
  const rawString = `${appSecret}${buildAliExpressSortedPayload(params)}${appSecret}`;

  return crypto
    .createHash("md5")
    .update(rawString, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function getAliExpressSortedSignableParams(params: AliExpressParams): Record<string, string> {
  return Object.fromEntries(
    Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
      .map((key) => [key, String(params[key])]),
  );
}

export function buildAliExpressSortedPayload(params: AliExpressParams) {
  return Object.entries(getAliExpressSortedSignableParams(params))
    .map(([key, value]) => `${key}${value}`)
    .join("");
}

export function createAliExpressSignedParams(method: AliExpressMethod, input: AliExpressParams = {}) {
  const config = getAliExpressConfig();
  const params = compactParams({
    method,
    app_key: config.appKey,
    timestamp: formatAliExpressTimestamp(new Date()),
    sign_method: SIGN_METHOD,
    v: API_VERSION,
    format: "json",
    tracking_id: config.trackingId,
    ...input,
  });
  const generatedSign = signAliExpressRequest(params, config.appSecret);

  return {
    apiUrl: config.apiUrl,
    appKey: config.appKey,
    appSecretLength: config.appSecret.length,
    trackingId: config.trackingId,
    params,
    generatedSign,
    sortedParamsWithoutSecret: getAliExpressSortedSignableParams(params),
  };
}

export async function debugAliExpressMinimalProductQuery(keyword = "gaming") {
  const signed = createAliExpressSignedParams(ALIEXPRESS_METHODS.PRODUCT_SEARCH, {
    keywords: getString(keyword) || "gaming",
  });
  const attempts = await Promise.all([
    callAliExpressSignedParams(signed.apiUrl, signed.params, signed.generatedSign, "POST_FORM"),
    callAliExpressSignedParams(signed.apiUrl, signed.params, signed.generatedSign, "GET_QUERY"),
  ]);

  return {
    hasAppKey: Boolean(signed.appKey),
    appKeyLength: signed.appKey.length,
    appSecretLength: signed.appSecretLength,
    trackingId: signed.trackingId,
    timestamp: String(signed.params.timestamp),
    paramsWithoutSecret: signed.sortedParamsWithoutSecret,
    generatedSign: signed.generatedSign,
    requestMethodUsed: "POST form-urlencoded and GET querystring",
    apiUrl: signed.apiUrl,
    attempts,
  };
}

export async function searchProducts(input: AliExpressParams) {
  const response = await callAliExpress(ALIEXPRESS_METHODS.PRODUCT_SEARCH, {
    keywords: getString(input.keywords) || getString(input.q),
    category_ids: getString(input.categoryIds) || getString(input.category_ids),
    page_no: clampInteger(input.page_no ?? input.page, 1, 100) ?? 1,
    page_size: clampInteger(input.page_size ?? input.pageSize, 1, 50) ?? 20,
    target_currency: getString(input.target_currency ?? input.currency) || "USD",
    target_language: getString(input.target_language ?? input.language) || "EN",
    ship_to_country: getString(input.ship_to_country ?? input.country),
    sort: getString(input.sort),
  });

  return normalizeProducts(response);
}

export async function getHotProducts(input: AliExpressParams) {
  const response = await callAliExpress(ALIEXPRESS_METHODS.HOT_PRODUCTS, {
    keywords: getString(input.keywords) || getString(input.q),
    category_ids: getString(input.categoryIds) || getString(input.category_ids),
    page_no: clampInteger(input.page_no ?? input.page, 1, 100) ?? 1,
    page_size: clampInteger(input.page_size ?? input.pageSize, 1, 50) ?? 20,
    target_currency: getString(input.target_currency ?? input.currency) || "USD",
    target_language: getString(input.target_language ?? input.language) || "EN",
    ship_to_country: getString(input.ship_to_country ?? input.country),
  });

  return normalizeProducts(response);
}

export async function getProductDetails(input: AliExpressParams) {
  const productIds = getString(input.product_ids ?? input.productIds ?? input.productId ?? input.id);

  if (!productIds) {
    throw new AliExpressError("חסר מזהה מוצר לבדיקה.", {
      status: 400,
      code: "PRODUCT_ID_REQUIRED",
    });
  }

  const response = await callAliExpress(ALIEXPRESS_METHODS.PRODUCT_DETAILS, {
    product_ids: productIds,
    target_currency: getString(input.target_currency ?? input.currency) || "USD",
    target_language: getString(input.target_language ?? input.language) || "EN",
    country: getString(input.country),
  });

  return normalizeProducts(response);
}

export async function generateAffiliateLinks(input: AliExpressParams & { urls?: unknown }) {
  const urls = Array.isArray(input.urls)
    ? input.urls.map((url) => getString(url)).filter(Boolean).join(",")
    : getString(input.source_values ?? input.sourceValues ?? input.url);

  if (!urls) {
    throw new AliExpressError("חסר קישור מוצר ליצירת קישור אפיליאייט.", {
      status: 400,
      code: "PRODUCT_URL_REQUIRED",
    });
  }

  const response = await callAliExpress(ALIEXPRESS_METHODS.GENERATE_LINK, {
    promotion_link_type: getString(input.promotion_link_type ?? input.promotionLinkType) || "0",
    source_values: urls,
  });

  return normalizeAffiliateLinks(response);
}

async function callAliExpress(method: AliExpressMethod, input: AliExpressParams) {
  const signed = createAliExpressSignedParams(method, input);

  logAliExpressSigningDebug(signed.sortedParamsWithoutSecret, signed.generatedSign);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({ ...stringifyParams(signed.params), sign: signed.generatedSign });
    const response = await fetch(signed.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new AliExpressError("הבקשה ל-AliExpress נכשלה. נסו שוב בעוד רגע.", {
        status: response.status,
        code: "ALIEXPRESS_HTTP_ERROR",
        details: redactSensitive(payload),
      });
    }

    const apiError = findApiError(payload);
    if (apiError) {
      console.error("[AliExpress API debug] raw AliExpress error", redactSensitive(payload));
      throw new AliExpressError(apiError.message, {
        status: 502,
        code: apiError.code,
        details: redactSensitive(payload),
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof AliExpressError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AliExpressError("החיבור ל-AliExpress לקח יותר מדי זמן. נסו שוב.", {
        status: 504,
        code: "ALIEXPRESS_TIMEOUT",
      });
    }

    throw new AliExpressError("לא הצלחנו להתחבר ל-AliExpress כרגע. נסו שוב מאוחר יותר.", {
      status: 502,
      code: "ALIEXPRESS_NETWORK_ERROR",
      details: error instanceof Error ? { message: error.message } : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callAliExpressSignedParams(
  apiUrl: string,
  params: Record<string, string | number | boolean>,
  sign: string,
  transport: AliExpressTransport,
) {
  const paramsWithSign = { ...stringifyParams(params), sign };
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response =
      transport === "GET_QUERY"
        ? await fetch(`${apiUrl}?${new URLSearchParams(paramsWithSign)}`, {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          })
        : await fetch(apiUrl, {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body: new URLSearchParams(paramsWithSign),
            signal: controller.signal,
            cache: "no-store",
          });
    const payload = await parseResponse(response);
    const apiError = findApiError(payload);

    if (apiError) {
      console.error(`[AliExpress API debug] ${transport} raw AliExpress error`, redactSensitive(payload));
    }

    return {
      transport,
      ok: response.ok && !apiError,
      httpStatus: response.status,
      aliExpressError: apiError,
      elapsedMs: Date.now() - startedAt,
      rawResponse: redactSensitive(payload),
    };
  } catch (error) {
    return {
      transport,
      ok: false,
      httpStatus: null,
      aliExpressError: {
        code: "REQUEST_FAILED",
        message: error instanceof Error ? error.message : "AliExpress debug request failed.",
      },
      elapsedMs: Date.now() - startedAt,
      rawResponse: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function logAliExpressSigningDebug(params: Record<string, string>, sign: string) {
  console.info("[AliExpress API debug] sorted params without secret", params);
  console.info("[AliExpress API debug] generated sign", sign);
}

function normalizeProducts(payload: unknown): NormalizedProduct[] {
  return findObjectArrays(payload)
    .flat()
    .map((item) => normalizeProduct(asRecord(item)))
    .filter((product) => product.id || product.title || product.productUrl || product.affiliateUrl);
}

function normalizeProduct(product: UnknownRecord | null): NormalizedProduct {
  if (!product) {
    return emptyProduct();
  }

  const image = getString(pickFirst(product, [
    "product_main_image_url",
    "product_small_image_urls",
    "product_image",
    "image",
    "image_url",
  ]));
  const productUrl = getString(pickFirst(product, [
    "product_detail_url",
    "product_url",
    "detail_url",
    "item_url",
  ]));
  const affiliateUrl = getString(pickFirst(product, [
    "promotion_link",
    "affiliate_link",
    "click_url",
    "target_url",
  ]));

  return {
    id: getString(pickFirst(product, ["product_id", "productId", "item_id", "id"])),
    title: getString(pickFirst(product, ["product_title", "title", "productTitle", "subject"])),
    image,
    price: getString(pickFirst(product, [
      "target_sale_price",
      "sale_price",
      "app_sale_price",
      "current_price",
      "salePrice",
    ])),
    originalPrice: getString(pickFirst(product, [
      "target_original_price",
      "original_price",
      "app_sale_price_original",
      "originalPrice",
    ])),
    rating: normalizeRating(pickFirst(product, ["evaluate_rate", "rating", "avg_rating", "score"])),
    orders: normalizeInteger(pickFirst(product, ["lastest_volume", "latest_volume", "orders", "order_count", "volume"])),
    productUrl: productUrl || affiliateUrl || null,
    affiliateUrl: affiliateUrl || null,
  };
}

function normalizeAffiliateLinks(payload: unknown): NormalizedAffiliateLink[] {
  return findObjectArrays(payload)
    .flat()
    .map((item) => asRecord(item))
    .filter((item): item is UnknownRecord => Boolean(item))
    .map((item) => ({
      productUrl: getString(pickFirst(item, ["source_value", "source_url", "url"])) || null,
      affiliateUrl: getString(pickFirst(item, ["promotion_link", "affiliate_link", "target_url"])) || "",
    }))
    .filter((link) => link.affiliateUrl);
}

function emptyProduct(): NormalizedProduct {
  return {
    id: null,
    title: null,
    image: null,
    price: null,
    originalPrice: null,
    rating: null,
    orders: null,
    productUrl: null,
    affiliateUrl: null,
  };
}

function compactParams(params: AliExpressParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Record<string, string | number | boolean>;
}

function stringifyParams(params: Record<string, string | number | boolean>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]));
}

function formatAliExpressTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const gmt8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  return [
    gmt8Date.getUTCFullYear(),
    "-",
    pad(gmt8Date.getUTCMonth() + 1),
    "-",
    pad(gmt8Date.getUTCDate()),
    " ",
    pad(gmt8Date.getUTCHours()),
    ":",
    pad(gmt8Date.getUTCMinutes()),
    ":",
    pad(gmt8Date.getUTCSeconds()),
  ].join("");
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function findApiError(payload: unknown): { code: string; message: string } | null {
  const root = asRecord(payload);
  const directError = asRecord(root?.error_response) || asRecord(root?.errorResponse);
  const nestedError = findObject(payload, (value) => {
    const code = getString(value.code);
    return Boolean(code && (value.msg || value.message || value.sub_msg));
  });
  const error = directError || nestedError;

  if (!error) {
    return null;
  }

  return {
    code: getString(error.code) || "ALIEXPRESS_RESPONSE_ERROR",
    message:
      getString(error.sub_msg) ||
      getString(error.msg) ||
      getString(error.message) ||
      "AliExpress החזירה שגיאה בבקשה.",
  };
}

function findObjectArrays(value: unknown, found: UnknownRecord[][] = []): UnknownRecord[][] {
  if (Array.isArray(value)) {
    const objectItems = value.map((item) => asRecord(item)).filter((item): item is UnknownRecord => Boolean(item));

    if (objectItems.length) {
      found.push(objectItems);
    }

    value.forEach((item) => findObjectArrays(item, found));
    return found;
  }

  const record = asRecord(value);
  if (!record) {
    return found;
  }

  Object.values(record).forEach((item) => findObjectArrays(item, found));
  return found;
}

function findObject(value: unknown, predicate: (value: UnknownRecord) => boolean): UnknownRecord | null {
  const record = asRecord(value);

  if (record && predicate(record)) {
    return record;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, predicate);
      if (found) return found;
    }
  } else if (record) {
    for (const item of Object.values(record)) {
      const found = findObject(item, predicate);
      if (found) return found;
    }
  }

  return null;
}

function pickFirst(source: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      const first = value.find((item) => getString(item));
      if (first !== undefined) return first;
    } else if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function getString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function normalizeInteger(value: unknown): number | null {
  const stringValue = getString(value);
  if (!stringValue) return null;

  const number = Number.parseInt(stringValue.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(number) ? number : null;
}

function normalizeRating(value: unknown): string | null {
  const stringValue = getString(value);
  if (!stringValue) return null;

  return stringValue;
}

function clampInteger(value: unknown, min: number, max: number): number | undefined {
  const number = Number(getString(value));
  if (!Number.isFinite(number)) return undefined;

  return Math.min(Math.max(Math.trunc(number), min), max);
}

function redactSensitive(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("secret") || normalizedKey === "sign" || normalizedKey === "app_secret") {
      return "[redacted]";
    }
    return child;
  })) as unknown;
}
