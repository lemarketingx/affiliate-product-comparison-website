import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import { unknownQuality } from "../aliexpress/quality";
import { categories } from "../dealpilot/categories";
import { queryAffiliateProductsPage, queryProductDetails } from "../aliexpress/affiliate";
import { newProfileState } from "../aliexpress/detail-profiles";
import { runDiscovery, runPriceRefresh, type Rpc, type Trigger } from "./pipeline";
import { displayPrice, PRICE_MAX_AGE_HOURS } from "./price-view";
import type { CatalogItem, CatalogSnapshot } from "../aliexpress/catalog";

// Dedicated DealPilot database (never the mortgage projects). Server-only
// service role; never exposed with a NEXT_PUBLIC_ prefix.
const url = () => process.env.DEALPILOT_SUPABASE_URL?.trim();
const key = () => process.env.DEALPILOT_SUPABASE_SERVICE_ROLE_KEY?.trim();

export function storeConfigured() {
  const u = url();
  return Boolean(u && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u) && key());
}

let client: SupabaseClient | null = null;
function db() {
  if (!storeConfigured()) throw new Error("STORE_NOT_CONFIGURED");
  client ??= createClient(url()!, key()!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** One dp_* SQL function, one jsonb argument (same contract as the pglite tests). */
export const rpc: Rpc = async (fn, args) => {
  if (!/^dp_[a-z_]+$/.test(fn)) throw new Error("INVALID_RPC");
  const { data, error } = await db().rpc(fn, { p: args });
  // Never forward database messages to callers; keep a short, safe code.
  if (error) throw new Error("DB_" + String(error.code ?? "ERROR").replace(/[^A-Za-z0-9]/g, "").slice(0, 20));
  return data;
};

const intEnv = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
};
export const priceMaxAgeHours = () => intEnv("DEALPILOT_PRICE_MAX_AGE_HOURS", PRICE_MAX_AGE_HOURS, 1, 240);

type Row = {
  product_id: string; title: string; title_language: "he" | "source"; brand: string | null;
  supplier_brand: string | null; shop_name: string | null; category_slug: string; category_label: string;
  image: string; images: string[]; product_url: string; affiliate_url: string; orders: number | null;
  positive_feedback: number | null; commission_rate: string | null; price: number | null; currency: string | null;
  price_field: CatalogItem["priceField"]; price_method: "search" | "detail" | "confirmed" | null; sku_id: string | null;
  price_observed_at: string | null; first_published_at: string | null; last_seen_at: string;
};

export function rowToItem(r: Row, now = new Date()): CatalogItem {
  const shown = displayPrice(r, now, priceMaxAgeHours());
  return {
    id: r.product_id,
    title: r.title,
    price: shown.price,
    currency: shown.currency,
    image: r.image,
    productUrl: r.product_url,
    affiliateUrl: r.affiliate_url,
    commissionRate: r.commission_rate,
    orders: r.orders,
    shipTo: null,
    requestedCountry: "IL",
    titleLanguage: r.title_language,
    images: Array.isArray(r.images) ? r.images : [],
    shopName: r.shop_name,
    supplierBrand: r.supplier_brand,
    positiveFeedbackPercent: r.positive_feedback === null ? null : Number(r.positive_feedback),
    quality: unknownQuality(),
    priceField: shown.price ? r.price_field : null,
    priceFields: { skuId: r.sku_id } as CatalogItem["priceFields"],
    category: r.category_label,
    categorySlug: r.category_slug,
    priceStatus: shown.status,
    priceObservedAt: shown.observedAt,
    priceMethod: r.price_method,
  };
}

const STORE_TAG = "dealpilot-store-catalog";
const cachedRows = unstable_cache(async () => (await rpc("dp_catalog", { limit: 1200 })) as Row[], ["dp-store-catalog-v1"], {
  revalidate: 300,
  tags: [STORE_TAG],
});

/** Published catalog from the database (cached 5 minutes, invalidated after each job). */
export async function getStoredSnapshot(): Promise<CatalogSnapshot> {
  const rows = await cachedRows();
  const items = rows.map((r) => rowToItem(r));
  const seen = rows.map((r) => r.last_seen_at).sort();
  return { items, fetchedAt: seen[0] ?? null, available: true, partial: false, qualityFiltered: false, source: "store" };
}

export async function storedPriceHistory(productId: string) {
  if (!storeConfigured() || !/^\d{4,24}$/.test(productId)) return [];
  try {
    return (await rpc("dp_price_history", { product_id: productId, limit: 90 })) as {
      observed_at: string; method: "search" | "detail"; price: number; currency: string; price_field: string | null; sku_id: string | null;
    }[];
  } catch {
    return [];
  }
}

/**
 * The scheduled job: discovery then price refresh, both bounded by provider
 * call budgets and a wall-clock deadline below the function's maxDuration.
 */
export async function runCatalogJobs(trigger: Trigger, options: { deadlineMs?: number } = {}) {
  const deadline = options.deadlineMs ?? 50_000;
  const started = Date.now();
  const discoverCalls = intEnv("DEALPILOT_IMPORT_MAX_CALLS", 40, 0, 400);
  const priceCalls = intEnv("DEALPILOT_PRICE_MAX_CALLS", 25, 0, 400);
  const guard = { key: "aliexpress-import-job", limit: discoverCalls + priceCalls + 10, periodMs: 3600_000 };
  const discovery = await runDiscovery({
    rpc,
    categories,
    trigger,
    maxCalls: discoverCalls,
    deadlineMs: Math.floor(deadline * 0.6),
    fetchPage: (term, pageNo, pageSize) => queryAffiliateProductsPage({ keywords: term, pageNo, pageSize, guard }),
  });
  const profileState = newProfileState();
  const prices = await runPriceRefresh({
    rpc,
    trigger,
    maxCalls: priceCalls,
    deadlineMs: Math.max(0, deadline - (Date.now() - started)),
    // One profile state per run: a profile the provider accepted is reused.
    fetchDetails: (ids, callsLeft) => queryProductDetails(ids, guard, profileState, callsLeft),
  });
  revalidateTag(STORE_TAG, { expire: 0 });
  return { discovery, prices };
}

export async function setUnpublished(productId: string, unpublished: boolean) {
  await rpc("dp_set_unpublished", { product_id: productId, unpublished });
  revalidateTag(STORE_TAG, { expire: 0 });
}

export async function recordStoredClick(productId: string, source: string, page: string | null) {
  if (!storeConfigured()) return false;
  try {
    await rpc("dp_record_click", { product_id: productId, source, page });
    return true;
  } catch {
    return false;
  }
}

export async function dashboard() {
  return rpc("dp_dashboard", { price_max_age_hours: priceMaxAgeHours() }) as Promise<Dashboard>;
}

export type RunRow = {
  id: number; kind: "discover" | "price_refresh"; trigger: string; status: string; started_at: string;
  finished_at: string | null; stats: Record<string, unknown>; error_codes: Record<string, number>;
};
export type Dashboard = {
  totals: {
    all: number; published: number; rejected: number; unpublished: number; published_today: number;
    published_without_current_price: number; published_detail_checked: number;
  };
  reject_reasons: Record<string, number>;
  runs: RunRow[];
  events: { at: string; level: string; code: string; term: string | null; product_id: string | null; detail: string | null; run_id: number | null }[];
  price_gaps: {
    product_id: string; title: string; search_price: number; search_currency: string; search_sku: string | null;
    search_at: string; detail_price: number; detail_currency: string; detail_sku: string | null; detail_at: string;
    price_field: string | null; gap_pct: number | null; search_fields: Record<string, string | null>; detail_fields: Record<string, string | null>;
  }[];
  clicks_30d: { total: number; by_source: Record<string, number>; top_products: { product_id: string; clicks: number }[] };
};
