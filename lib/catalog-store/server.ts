import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import { unknownQuality } from "../aliexpress/quality";
import { categories } from "../dealpilot/categories";
import { queryAffiliateProductsPage, queryProductDetails } from "../aliexpress/affiliate";
import { newProfileState, rejectedProfiles } from "../aliexpress/detail-profiles";
import { runDiscovery, runLinkCheck, runPriceRefresh, type Rpc, type Trigger } from "./pipeline";
import { checkAffiliateLink } from "../aliexpress/link-check";
import { createPacer } from "../aliexpress/pacer";
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
  if (error) {
    // DP409 = another provider job is running (dp_start_run lock).
    if (error.code === "DP409") throw new Error("RUN_IN_PROGRESS");
    throw new Error("DB_" + String(error.code ?? "ERROR").replace(/[^A-Za-z0-9]/g, "").slice(0, 20));
  }
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
export type CatalogJob = "discover" | "prices" | "links" | "all";
export const isCatalogJob = (v: unknown): v is CatalogJob => v === "discover" || v === "prices" || v === "links" || v === "all";

// Link checks follow redirects only (never load the product page), spaced apart.
const linkPace = createPacer(800);
async function fetchHop(url: string): Promise<{ status: number; location: string | null; body: string | null }> {
  const res = await linkPace(() =>
    fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (DealPilot link check)", "Accept-Language": "he-IL,he;q=0.9" },
    }),
  );
  let body: string | null = null;
  if (res.status === 200 && res.body) {
    // Only the first 64 KB: enough for a meta-refresh or script redirect.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 65536) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => undefined);
    body = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  } else {
    await res.body?.cancel().catch(() => undefined);
  }
  return { status: res.status, location: res.headers.get("location"), body };
}

/** Link verification job (separate from imports and price checks). */
export async function runLinkJob(trigger: Trigger, deadlineMs = 50_000) {
  const result = await runLinkCheck({
    rpc,
    trigger,
    maxChecks: intEnv("DEALPILOT_LINK_CHECKS", 8, 0, 50),
    deadlineMs,
    check: (link, id) => checkAffiliateLink(link, id, fetchHop),
  });
  revalidateTag(STORE_TAG, { expire: 0 });
  return result;
}

export async function linkSummary() {
  return rpc("dp_link_summary", {}) as Promise<{
    published: number; checked: number; ok: number; broken: number; with_aff_params: number;
    unpublished_by_link: number; last_checked_at: string | null;
  }>;
}

/**
 * Scheduled jobs. Discovery (search calls) and price refresh (product-ID
 * calls) run separately — each has its own cron and its own call budget — so
 * a price check never spends calls on searching. "all" runs both in order.
 * The database refuses to start a job while another is running (RUN_IN_PROGRESS).
 */
export async function runCatalogJobs(trigger: Trigger, options: { deadlineMs?: number; job?: CatalogJob } = {}) {
  const job = options.job ?? "all";
  if (job === "links") return { job, discovery: null, prices: null, links: await runLinkJob(trigger, options.deadlineMs) };
  const deadline = options.deadlineMs ?? 50_000;
  const started = Date.now();
  const discoverCalls = intEnv("DEALPILOT_IMPORT_MAX_CALLS", 40, 0, 400);
  const priceCalls = intEnv("DEALPILOT_PRICE_MAX_CALLS", 25, 0, 400);
  // Per-process flood guard only; the database lock and the provider limits are authoritative.
  const guard = { key: "aliexpress-import-job", limit: discoverCalls + priceCalls + 10, periodMs: 3600_000 };
  const discovery =
    job === "prices"
      ? null
      : await runDiscovery({
          rpc,
          categories,
          trigger,
          maxCalls: discoverCalls,
          deadlineMs: job === "all" ? Math.floor(deadline * 0.5) : deadline,
          fetchPage: (term, pageNo, pageSize) => queryAffiliateProductsPage({ keywords: term, pageNo, pageSize, guard }),
        });
  let prices = null;
  if (job !== "discover") {
    // Skip parameter profiles AliExpress rejected in the last 30 days.
    let rejected: string[] = [];
    try {
      rejected = ((await rpc("dp_last_detail_profile", {})) as { rejected?: string[] }).rejected ?? [];
    } catch {
      rejected = [];
    }
    const profileState = newProfileState(rejected);
    prices = await runPriceRefresh({
      rpc,
      trigger,
      maxCalls: priceCalls,
      deadlineMs: Math.max(0, deadline - (Date.now() - started)),
      fetchDetails: (ids, callsLeft) => queryProductDetails(ids, guard, profileState, callsLeft),
    });
    // Persist which profiles were rejected, so later runs do not pay for them again.
    const newlyRejected = rejectedProfiles(profileState);
    if (newlyRejected.length)
      await rpc("dp_log_events", {
        run_id: prices.runId,
        events: newlyRejected.map((name) => ({ level: "info", code: "DETAIL_PROFILE_REJECTED", detail: name })),
      }).catch(() => undefined);
  }
  revalidateTag(STORE_TAG, { expire: 0 });
  return { job, discovery, prices, links: null };
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
