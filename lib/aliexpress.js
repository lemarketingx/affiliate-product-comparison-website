import "server-only";
import crypto from "node:crypto";

const DEFAULT_API_URL = "https://api-sg.aliexpress.com/sync";
const SIGN_METHOD = "sha256";
const API_VERSION = "2.0";
const DEFAULT_TIMEOUT_MS = 8000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 45;

export const ALIEXPRESS_METHODS = {
  PRODUCT_QUERY: "aliexpress.affiliate.product.query",
  PRODUCT_DETAIL: "aliexpress.affiliate.productdetail.get",
  LINK_GENERATE: "aliexpress.affiliate.link.generate",
  HOT_PRODUCT_QUERY: "aliexpress.affiliate.hotproduct.query",
};

const rateLimitBuckets = new Map();

export class AliExpressApiError extends Error {
  constructor(message, { status = 500, code = "ALIEXPRESS_API_ERROR", details } = {}) {
    super(message);
    this.name = "AliExpressApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getAliExpressConfig() {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
  const apiUrl = process.env.ALIEXPRESS_API_URL || DEFAULT_API_URL;

  return {
    appKey,
    appSecret,
    trackingId,
    apiUrl,
    isConfigured: Boolean(appKey && appSecret && trackingId),
    missing: [
      ["ALIEXPRESS_APP_KEY", appKey],
      ["ALIEXPRESS_APP_SECRET", appSecret],
      ["ALIEXPRESS_TRACKING_ID", trackingId],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key),
  };
}

export function getAliExpressVerification() {
  const config = getAliExpressConfig();

  return {
    provider: "aliexpress",
    configured: config.isConfigured,
    missing: config.missing,
    apiUrl: config.apiUrl,
    supportedMethods: Object.values(ALIEXPRESS_METHODS),
    secretsExposed: false,
  };
}

export function assertAliExpressConfigured() {
  const config = getAliExpressConfig();

  if (!config.isConfigured) {
    throw new AliExpressApiError("AliExpress API environment variables are not fully configured.", {
      status: 503,
      code: "ALIEXPRESS_NOT_CONFIGURED",
      details: { missing: config.missing },
    });
  }

  return config;
}

export function checkRateLimit(key = "anonymous") {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new AliExpressApiError("Too many AliExpress requests. Please retry shortly.", {
      status: 429,
      code: "ALIEXPRESS_RATE_LIMITED",
      details: { retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) },
    });
  }

  bucket.count += 1;
}

export function signAliExpressRequest(params, appSecret, apiName = "") {
  const sortedKeys = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort();

  const signingPayload = sortedKeys.reduce(
    (payload, key) => `${payload}${key}${String(params[key])}`,
    apiName,
  );

  return crypto
    .createHmac("sha256", appSecret)
    .update(signingPayload, "utf8")
    .digest("hex")
    .toUpperCase();
}

export async function callAliExpress(method, businessParams = {}, options = {}) {
  const config = assertAliExpressConfigured();

  checkRateLimit(options.rateLimitKey);

  const params = compactParams({
    method,
    app_key: config.appKey,
    timestamp: Date.now().toString(),
    sign_method: SIGN_METHOD,
    v: API_VERSION,
    format: "json",
    tracking_id: config.trackingId,
    ...businessParams,
  });

  const sign = signAliExpressRequest(params, config.appSecret, method);
  const body = new URLSearchParams({ ...params, sign });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await parseAliExpressResponse(response);

    if (!response.ok) {
      throw new AliExpressApiError("AliExpress API request failed.", {
        status: response.status,
        code: "ALIEXPRESS_HTTP_ERROR",
        details: safeDetails(payload),
      });
    }

    const apiError = findAliExpressError(payload);
    if (apiError) {
      throw new AliExpressApiError(apiError.message, {
        status: 502,
        code: apiError.code,
        details: safeDetails(payload),
      });
    }

    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AliExpressApiError("AliExpress API request timed out.", {
        status: 504,
        code: "ALIEXPRESS_TIMEOUT",
      });
    }

    if (error instanceof AliExpressApiError) {
      throw error;
    }

    throw new AliExpressApiError("AliExpress API request could not be completed.", {
      status: 502,
      code: "ALIEXPRESS_NETWORK_ERROR",
      details: { message: error.message },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchProducts(params, options) {
  const payload = await callAliExpress(
    ALIEXPRESS_METHODS.PRODUCT_QUERY,
    normalizeProductQueryParams(params),
    options,
  );

  return {
    raw: payload,
    items: mapProductList(payload),
  };
}

export async function getProductDetail(params, options) {
  const payload = await callAliExpress(
    ALIEXPRESS_METHODS.PRODUCT_DETAIL,
    normalizeProductDetailParams(params),
    options,
  );

  return {
    raw: payload,
    item: mapProductList(payload)[0] || null,
  };
}

export async function getHotProducts(params, options) {
  const payload = await callAliExpress(
    ALIEXPRESS_METHODS.HOT_PRODUCT_QUERY,
    normalizeHotProductParams(params),
    options,
  );

  return {
    raw: payload,
    items: mapProductList(payload),
  };
}

export async function generateAffiliateLink(params, options) {
  const payload = await callAliExpress(
    ALIEXPRESS_METHODS.LINK_GENERATE,
    normalizeLinkGenerateParams(params),
    options,
  );

  return {
    raw: payload,
    links: mapAffiliateLinks(payload),
  };
}

export function mapProductList(payload) {
  const candidates = deepFindArrays(payload).flat();

  return candidates
    .filter((item) => item && typeof item === "object")
    .map(mapProduct)
    .filter((item) => item.title || item.image || item.affiliateLink);
}

export function mapProduct(product) {
  return {
    id: pickFirst(product, ["product_id", "productId", "item_id"]),
    title: pickFirst(product, ["product_title", "title", "productTitle"]),
    image: pickFirst(product, ["product_main_image_url", "image", "productImage", "product_small_image_urls"]),
    currentPrice: pickFirst(product, [
      "target_sale_price",
      "sale_price",
      "app_sale_price",
      "current_price",
      "salePrice",
    ]),
    originalPrice: pickFirst(product, [
      "target_original_price",
      "original_price",
      "app_sale_price_original",
      "originalPrice",
    ]),
    rating: pickFirst(product, ["evaluate_rate", "rating", "avg_rating"]),
    orders: pickFirst(product, ["lastest_volume", "orders", "order_count", "volume"]),
    affiliateLink: pickFirst(product, [
      "promotion_link",
      "affiliate_link",
      "product_detail_url",
      "product_url",
      "click_url",
    ]),
  };
}

export function mapAffiliateLinks(payload) {
  return deepFindArrays(payload)
    .flat()
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      sourceUrl: pickFirst(item, ["source_value", "source_url", "url"]),
      affiliateLink: pickFirst(item, ["promotion_link", "affiliate_link", "target_url"]),
    }))
    .filter((item) => item.affiliateLink);
}

export function normalizeRouteError(error) {
  if (error instanceof AliExpressApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
      },
    },
  };
}

export function buildRateLimitKey(request, namespace) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  return `${namespace}:${forwardedFor || realIp || "local"}`;
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeProductQueryParams(params = {}) {
  return compactParams({
    keywords: params.keywords || params.q,
    category_ids: params.categoryIds || params.category_ids,
    page_no: clampNumber(params.page || params.page_no, 1, 100),
    page_size: clampNumber(params.pageSize || params.page_size, 1, 50),
    target_currency: params.currency || params.target_currency,
    target_language: params.language || params.target_language,
    ship_to_country: params.country || params.ship_to_country,
    sort: params.sort,
  });
}

function normalizeProductDetailParams(params = {}) {
  return compactParams({
    product_ids: params.productId || params.productIds || params.product_ids || params.id,
    target_currency: params.currency || params.target_currency,
    target_language: params.language || params.target_language,
    country: params.country,
  });
}

function normalizeHotProductParams(params = {}) {
  return compactParams({
    keywords: params.keywords || params.q,
    category_ids: params.categoryIds || params.category_ids,
    page_no: clampNumber(params.page || params.page_no, 1, 100),
    page_size: clampNumber(params.pageSize || params.page_size, 1, 50),
    target_currency: params.currency || params.target_currency,
    target_language: params.language || params.target_language,
    ship_to_country: params.country || params.ship_to_country,
  });
}

function normalizeLinkGenerateParams(params = {}) {
  const sourceValues = Array.isArray(params.urls)
    ? params.urls.join(",")
    : params.sourceValues || params.source_values || params.url;

  return compactParams({
    promotion_link_type: params.promotionLinkType || params.promotion_link_type || 0,
    source_values: sourceValues,
  });
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return Math.min(Math.max(Math.trunc(number), min), max);
}

async function parseAliExpressResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function findAliExpressError(payload) {
  const rootError = payload?.error_response || payload?.errorResponse;
  const nestedError = deepFindObject(payload, (value) => value?.code && (value?.msg || value?.message));
  const error = rootError || nestedError;

  if (!error) {
    return null;
  }

  return {
    code: error.code || "ALIEXPRESS_RESPONSE_ERROR",
    message: error.msg || error.message || error.sub_msg || "AliExpress returned an error response.",
  };
}

function safeDetails(payload) {
  return JSON.parse(JSON.stringify(payload, (key, value) => {
    if (key.toLowerCase().includes("secret") || key.toLowerCase() === "sign") {
      return "[redacted]";
    }
    return value;
  }));
}

function deepFindArrays(value, found = []) {
  if (!value || typeof value !== "object") {
    return found;
  }

  if (Array.isArray(value)) {
    found.push(value);
    value.forEach((item) => deepFindArrays(item, found));
    return found;
  }

  Object.values(value).forEach((item) => deepFindArrays(item, found));
  return found;
}

function deepFindObject(value, predicate) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (!Array.isArray(value) && predicate(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    const found = deepFindObject(child, predicate);
    if (found) {
      return found;
    }
  }

  return null;
}

function pickFirst(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) {
        return first;
      }
    } else if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}
