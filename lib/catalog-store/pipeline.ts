// Persistent catalog pipeline: Discover → Normalize → Validate → Deduplicate →
// Publish (upsert) → Refresh prices. Pure: the provider calls and the database
// are injected, so the exact production SQL is exercised in tests (pglite) and
// the provider can be a recorded fixture. Nothing here keeps state in memory
// between runs; every cursor, product and price lives in the database.
import type { AliProduct } from "../aliexpress/normalize.ts";
import type { ProductPage } from "../aliexpress/query.ts";
import { CATALOG_POLICY, publicRejections, type CategoryDef, type RejectReason } from "../aliexpress/catalog-build.ts";
import { identifyListedBrand } from "../dealpilot/brands.ts";

/** Calls one dp_* SQL function with a single jsonb argument. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
export type Trigger = "cron" | "manual" | "test";

export const PIPELINE_POLICY = {
  /** Daily goal for NEW unique published products. Never a reason to relax rules. */
  dailyNewTarget: 50,
  pageSizes: [50, 20, 10],
  maxPage: 100,
  /** An exhausted term is searched again from page 1 after this many days. */
  resetAfterDays: 7,
  detailBatch: 20,
  /** A product's price is re-checked by product ID at most this often. */
  priceMinAgeHours: 20,
} as const;

const errCode = (e: unknown) =>
  typeof e === "object" && e && "code" in e && typeof (e as { code: unknown }).code === "string"
    ? (e as { code: string }).code
    : e instanceof Error && /^[A-Z0-9_]{3,60}$/.test(e.message)
      ? e.message
      : "UNKNOWN";
const isQuota = (code: string) => /ApiCallLimit|QUOTA|LIMIT|HTTP_429/i.test(code);
const isBadParam = (code: string) => /INVALID_PARAMETER|isv\.invalid|PAGE_SIZE/i.test(code);

export const termKey = (slug: string, term: string) => `${slug}:${term.toLowerCase()}`;

type TermRow = { key: string; term: string; category_slug: string; category_label: string; page: number };
type Event = { level: "info" | "warn" | "error"; code: string; term?: string; product_id?: string; detail?: string };

/** The database row for one provider product (snake_case, as dp_ingest reads it). */
export function toIngestItem(
  p: AliProduct,
  cat: { slug: string; label: string },
  term: string,
  reasons: RejectReason[],
) {
  const brand = identifyListedBrand(p);
  return {
    product_id: p.id,
    title: p.title.slice(0, 600),
    title_language: p.titleLanguage,
    brand: brand?.name ?? null,
    supplier_brand: p.supplierBrand,
    shop_name: p.shopName,
    category_slug: cat.slug,
    category_label: cat.label,
    image: p.image,
    images: p.images.slice(0, 8),
    product_url: p.productUrl,
    affiliate_url: p.affiliateUrl,
    orders: p.orders,
    positive_feedback: p.positiveFeedbackPercent,
    commission_rate: p.commissionRate,
    status: reasons.length ? "rejected" : "published",
    reject_reasons: reasons,
    term,
    price: p.price,
    currency: p.currency,
    price_field: p.priceField,
    sku_id: p.priceFields.skuId,
    price_fields: p.priceFields,
  };
}

export type DiscoverStats = {
  calls: number;
  pagesOk: number;
  pagesFailed: number;
  rows: number;
  uniqueInRun: number;
  duplicatesInRun: number;
  valid: number;
  rejected: Partial<Record<RejectReason, number>>;
  inserted: number;
  updated: number;
  publishedNew: number;
  snapshots: number;
  termsExhausted: number;
  quotaStopped: boolean;
  pageSize: number | null;
  dailyNewTarget: number;
};

export type DiscoverOptions = {
  rpc: Rpc;
  categories: readonly CategoryDef[];
  fetchPage: (term: string, pageNo: number, pageSize: number) => Promise<ProductPage>;
  trigger: Trigger;
  /** Hard ceiling on provider calls in this run. */
  maxCalls: number;
  concurrency?: number;
  /** Stop starting new provider calls after this many ms (serverless time limit). */
  deadlineMs?: number;
  minSales?: number;
  now?: () => Date;
};

export async function runDiscovery(o: DiscoverOptions): Promise<{ runId: number; status: string; stats: DiscoverStats; errorCodes: Record<string, number> }> {
  const started = Date.now();
  const now = o.now ?? (() => new Date());
  const { id: runId } = (await o.rpc("dp_start_run", { kind: "discover", trigger: o.trigger })) as { id: number };
  const stats: DiscoverStats = {
    calls: 0, pagesOk: 0, pagesFailed: 0, rows: 0, uniqueInRun: 0, duplicatesInRun: 0, valid: 0,
    rejected: {}, inserted: 0, updated: 0, publishedNew: 0, snapshots: 0, termsExhausted: 0,
    quotaStopped: false, pageSize: null, dailyNewTarget: PIPELINE_POLICY.dailyNewTarget,
  };
  const errorCodes: Record<string, number> = {};
  const events: Event[] = [];
  const seen = new Set<string>();
  try {
    const terms = o.categories.flatMap((c) =>
      c.terms.map((term) => ({ key: termKey(c.slug, term), term, category_slug: c.slug, category_label: c.label })),
    );
    await o.rpc("dp_sync_terms", { terms });
    // Terms that failed in this run are not retried in the same run.
    const failedKeys = new Set<string>();
    const nextQueue = async () =>
      ((await o.rpc("dp_next_terms", {
        limit: Math.max(0, o.maxCalls - stats.calls),
        reset_after_days: PIPELINE_POLICY.resetAfterDays,
      })) as TermRow[]).filter((t) => !failedKeys.has(t.key));
    let queue = await nextQueue();
    const sizes = [...PIPELINE_POLICY.pageSizes];
    let sizeIndex = 0;
    let accepted: number | null = null;

    const one = async (t: TermRow) => {
      for (;;) {
        const size = accepted ?? sizes[sizeIndex];
        stats.calls++;
        try {
          const page = await o.fetchPage(t.term, t.page, size);
          accepted ??= size;
          return { ok: true as const, page, size };
        } catch (e) {
          const code = errCode(e);
          if (accepted === null && isBadParam(code) && sizeIndex < sizes.length - 1 && stats.calls < o.maxCalls) {
            sizeIndex++;
            continue;
          }
          return { ok: false as const, code };
        }
      }
    };

    let cursor = 0;
    while (!stats.quotaStopped && stats.calls < o.maxCalls) {
      // Keep going deeper (page 2, 3, ...) until the call budget or deadline is spent.
      if (cursor >= queue.length) {
        queue = await nextQueue();
        cursor = 0;
        if (!queue.length) break;
      }
      if (o.deadlineMs !== undefined && Date.now() - started > o.deadlineMs) {
        events.push({ level: "warn", code: "DEADLINE_REACHED", detail: `${queue.length - cursor} terms left for the next run` });
        break;
      }
      // The first call alone establishes the accepted page size.
      const width = accepted === null ? 1 : Math.max(1, Math.min(o.concurrency ?? 4, o.maxCalls - stats.calls));
      const batch = queue.slice(cursor, cursor + width);
      cursor += batch.length;
      const results = await Promise.all(batch.map(one));
      const items: ReturnType<typeof toIngestItem>[] = [];
      for (let i = 0; i < batch.length; i++) {
        const t = batch[i], r = results[i];
        if (!r.ok) {
          stats.pagesFailed++;
          errorCodes[r.code] = (errorCodes[r.code] ?? 0) + 1;
          events.push({ level: "error", code: r.code.slice(0, 80), term: t.term, detail: `page ${t.page}` });
          if (isQuota(r.code)) stats.quotaStopped = true;
          failedKeys.add(t.key);
          continue; // cursor not advanced: the same page is retried next run
        }
        stats.pagesOk++;
        const { products, meta } = r.page;
        // Results are sorted by reported sales: once a page has nothing above
        // the sales threshold, deeper pages cannot qualify — the term is exhausted.
        const minSales = o.minSales ?? CATALOG_POLICY.minimumReportedSalesExclusive;
        const full = products.length >= r.size && products.some((p) => (p.orders ?? 0) > minSales);
        if (!full) stats.termsExhausted++;
        await o.rpc("dp_advance_term", { key: t.key, page: t.page, full, total: meta.totalRecordCount, max_page: PIPELINE_POLICY.maxPage });
        for (const p of products) {
          stats.rows++;
          if (seen.has(p.id)) { stats.duplicatesInRun++; continue; }
          seen.add(p.id);
          const reasons = publicRejections(p, o.minSales);
          if (reasons.length) for (const reason of reasons) stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
          else stats.valid++;
          items.push(toIngestItem(p, { slug: t.category_slug, label: t.category_label }, t.term, reasons));
        }
      }
      if (items.length) {
        const res = (await o.rpc("dp_ingest", { run_id: runId, observed_at: now().toISOString(), items })) as {
          inserted: number; updated: number; published_new: number; snapshots: number;
        };
        stats.inserted += res.inserted;
        stats.updated += res.updated;
        stats.publishedNew += res.published_new;
        stats.snapshots += res.snapshots;
      }
    }
    stats.uniqueInRun = seen.size;
    stats.pageSize = accepted;
    if (stats.quotaStopped) events.push({ level: "warn", code: "QUOTA_STOPPED", detail: "Provider call limit reached; remaining terms continue next run" });
    if (stats.publishedNew < PIPELINE_POLICY.dailyNewTarget)
      events.push({
        level: "warn",
        code: "BELOW_DAILY_TARGET",
        detail: `${stats.publishedNew} new published (target ${PIPELINE_POLICY.dailyNewTarget}); rules were not relaxed`,
      });
    const status = stats.pagesOk === 0 && stats.pagesFailed > 0 ? "failed" : stats.pagesFailed > 0 ? "partial" : "succeeded";
    if (events.length) await o.rpc("dp_log_events", { run_id: runId, events });
    await o.rpc("dp_finish_run", { id: runId, status, stats, error_codes: errorCodes });
    return { runId, status, stats, errorCodes };
  } catch (e) {
    const code = errCode(e);
    errorCodes[code] = (errorCodes[code] ?? 0) + 1;
    try {
      await o.rpc("dp_log_events", { run_id: runId, events: [...events, { level: "error", code: "RUN_CRASHED", detail: code }] });
      await o.rpc("dp_finish_run", { id: runId, status: "failed", stats, error_codes: errorCodes });
    } catch {
      // The database itself failed; dp_start_run closes this run as abandoned later.
    }
    throw e;
  }
}

export type PriceStats = {
  calls: number; checked: number; updated: number; confirmed: number; missing: number; invalid: number; unpublished: number;
  failedBatches: number; suspectBatches: number; quotaStopped: boolean;
  /** Detail parameter profile the provider accepted in this run. */
  profile: string | null;
};

export type DetailAnswer = {
  products: AliProduct[];
  missing: string[];
  /** Ids not requested in this call (smaller profile batch); due again, not missing. */
  deferred?: string[];
  /** Provider calls actually made (profile fallbacks included); default 1. */
  calls?: number;
  /** Parameter profile the provider accepted. */
  profile?: string;
};

export type PriceRefreshOptions = {
  rpc: Rpc;
  fetchDetails: (ids: string[], callsLeft: number) => Promise<DetailAnswer>;
  trigger: Trigger;
  maxCalls: number;
  deadlineMs?: number;
  minAgeHours?: number;
  now?: () => Date;
};

const errDetail = (e: unknown) =>
  typeof e === "object" && e && "detail" in e && typeof (e as { detail: unknown }).detail === "string"
    ? ((e as { detail: string }).detail as string).slice(0, 300)
    : null;
const errCalls = (e: unknown) =>
  typeof e === "object" && e && "calls" in e && Number.isSafeInteger((e as { calls: unknown }).calls) ? (e as { calls: number }).calls : 1;

/** Re-checks published products by product ID (oldest check first). */
export async function runPriceRefresh(o: PriceRefreshOptions): Promise<{ runId: number; status: string; stats: PriceStats; errorCodes: Record<string, number> }> {
  const started = Date.now();
  const now = o.now ?? (() => new Date());
  const { id: runId } = (await o.rpc("dp_start_run", { kind: "price_refresh", trigger: o.trigger })) as { id: number };
  const stats: PriceStats = {
    calls: 0, checked: 0, updated: 0, confirmed: 0, missing: 0, invalid: 0, unpublished: 0,
    failedBatches: 0, suspectBatches: 0, quotaStopped: false, profile: null,
  };
  const errorCodes: Record<string, number> = {};
  const events: Event[] = [];
  try {
    const queue = (await o.rpc("dp_due_for_price", {
      limit: Math.max(0, o.maxCalls) * PIPELINE_POLICY.detailBatch,
      min_age_hours: o.minAgeHours ?? PIPELINE_POLICY.priceMinAgeHours,
    })) as string[];
    let batches = 0;
    while (queue.length && stats.calls < o.maxCalls && !stats.quotaStopped) {
      if (o.deadlineMs !== undefined && Date.now() - started > o.deadlineMs) {
        events.push({ level: "warn", code: "DEADLINE_REACHED", detail: `${queue.length} products left` });
        break;
      }
      const ids = queue.splice(0, PIPELINE_POLICY.detailBatch);
      batches++;
      let answer: DetailAnswer;
      try {
        answer = await o.fetchDetails(ids, o.maxCalls - stats.calls);
      } catch (e) {
        const code = errCode(e);
        stats.calls += errCalls(e);
        stats.failedBatches++;
        errorCodes[code] = (errorCodes[code] ?? 0) + 1;
        const msg = errDetail(e);
        events.push({ level: "error", code: code.slice(0, 80), detail: `detail batch of ${ids.length}${msg ? " · provider: " + msg : ""}` });
        if (isQuota(code)) stats.quotaStopped = true;
        continue;
      }
      stats.calls += answer.calls ?? 1;
      if (answer.profile && answer.profile !== stats.profile) {
        stats.profile = answer.profile;
        events.push({ level: "info", code: "DETAIL_PROFILE_ACCEPTED", detail: answer.profile });
      }
      // Ids the accepted profile could not include in this call go back to the queue front.
      const deferred = answer.deferred ?? [];
      if (deferred.length) queue.unshift(...deferred);
      const asked = ids.filter((id) => !deferred.includes(id));
      const wanted = new Set(asked);
      const observations = answer.products
        .filter((p) => wanted.has(p.id))
        .map((p) => ({
          product_id: p.id,
          price: p.price,
          currency: p.currency,
          price_field: p.priceField,
          sku_id: p.priceFields.skuId,
          price_fields: p.priceFields,
        }));
      const returned = new Set(observations.map((x) => x.product_id));
      let missing = asked.filter((id) => !returned.has(id));
      // A batch where most ids are missing points at the call (batch limit,
      // provider hiccup), not at the products: log it, do not count misses.
      // An empty answer is equally ambiguous, whatever the batch size.
      if (missing.length && (observations.length === 0 || (asked.length >= 4 && missing.length * 2 > asked.length))) {
        events.push({ level: "warn", code: "DETAIL_BATCH_MOSTLY_MISSING", detail: `${missing.length}/${asked.length} ids not returned; misses not counted` });
        stats.suspectBatches++;
        missing = [];
      }
      const res = (await o.rpc("dp_record_prices", { run_id: runId, observed_at: now().toISOString(), observations, missing })) as {
        updated: number; confirmed?: number; missing: number; invalid: number; unpublished: number;
      };
      stats.checked += asked.length;
      stats.updated += res.updated;
      stats.confirmed += res.confirmed ?? 0;
      stats.missing += res.missing;
      stats.invalid += res.invalid;
      stats.unpublished += res.unpublished;
    }
    const status = batches > 0 && stats.failedBatches === batches ? "failed" : stats.failedBatches > 0 ? "partial" : "succeeded";
    if (events.length) await o.rpc("dp_log_events", { run_id: runId, events });
    await o.rpc("dp_finish_run", { id: runId, status, stats, error_codes: errorCodes });
    return { runId, status, stats, errorCodes };
  } catch (e) {
    const code = errCode(e);
    errorCodes[code] = (errorCodes[code] ?? 0) + 1;
    try {
      await o.rpc("dp_log_events", { run_id: runId, events: [...events, { level: "error", code: "RUN_CRASHED", detail: code }] });
      await o.rpc("dp_finish_run", { id: runId, status: "failed", stats, error_codes: errorCodes });
    } catch {
      /* see runDiscovery */
    }
    throw e;
  }
}
