// Staged, bounded public-catalog builder. Pure: the page fetcher is injected,
// so the policy, budgets and the honesty of the report are unit-tested.
import type { AliProduct } from "./affiliate.ts";
import type { ProductPage } from "./query.ts";
import { evaluateEligibility } from "./quality.ts";

export const CATALOG_POLICY = {
  /** Public listing requires strictly more reported sales than this. */
  minimumReportedSalesExclusive: 5000,
  target: 500,
  /** Stop requesting further pages once this many products are publishable. */
  stopAt: 650,
  /** Tried in order; the first size the provider accepts is used. */
  pageSizes: [50, 40, 20, 10],
  maxPagesPerTerm: 3,
  concurrency: 4,
  perPage: 24,
} as const;

export type CategoryDef = { slug: string; label: string; terms: readonly string[] };
export type PlanItem = { categoryIndex: number; termIndex: number; term: string; pageNo: number };
export type CatalogProduct = AliProduct & { category: string; categorySlug: string };

export type RejectReason =
  | "currency"
  | "sales"
  | "hebrew"
  | "price"
  | "image"
  | "product_url"
  | "affiliate"
  | "brand";
export const REJECT_LABELS: Record<RejectReason, string> = {
  currency: "המחיר לא הוחזר בשקלים (ILS)",
  sales: "5,000 מכירות מדווחות או פחות (או נתון חסר)",
  hebrew: "אין כותרת בעברית מהספק",
  price: "מחיר חסר או לא תקין",
  image: "אין תמונה תקינה",
  product_url: "אין קישור מוצר תקין",
  affiliate: "אין קישור שותפים תקין",
  brand: "מותג מוכר אינו מזוהה בהצלבת שם המוצר ונתוני הספק",
};

const AFFILIATE_HOSTS = ["s.click.aliexpress.com", "aliexpress.com", "aliexpress.us"];
export function validAffiliateUrl(raw: string | null, productUrl: string | null): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    if (!AFFILIATE_HOSTS.some((d) => host === d || host.endsWith("." + d))) return false;
    // A plain product URL is not an affiliate link.
    return raw !== productUrl;
  } catch {
    return false;
  }
}

/** All reasons a product cannot be listed publicly (empty = publishable). */
export function publicRejections(p: AliProduct, minSales: number = CATALOG_POLICY.minimumReportedSalesExclusive): RejectReason[] {
  const out: RejectReason[] = [];
  if (p.currency !== "ILS") out.push("currency");
  if (p.orders === null || !Number.isSafeInteger(p.orders) || p.orders <= minSales) out.push("sales");
  const blockers = evaluateEligibility(p).blockers;
  if (blockers.includes("hebrew")) out.push("hebrew");
  if (!p.price || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) out.push("price");
  if (!p.image) out.push("image");
  if (!p.productUrl) out.push("product_url");
  if (!validAffiliateUrl(p.affiliateUrl, p.productUrl)) out.push("affiliate");
  return out;
}

/** Page 1 of every term first (round-robin across categories), then page 2, ... */
export function buildFetchPlan(categories: readonly CategoryDef[], maxPages: number = CATALOG_POLICY.maxPagesPerTerm): PlanItem[] {
  const plan: PlanItem[] = [];
  const maxTerms = Math.max(0, ...categories.map((c) => c.terms.length));
  for (let pageNo = 1; pageNo <= maxPages; pageNo++)
    for (let termIndex = 0; termIndex < maxTerms; termIndex++)
      categories.forEach((c, categoryIndex) => {
        const term = c.terms[termIndex];
        if (term) plan.push({ categoryIndex, termIndex, term, pageNo });
      });
  return plan;
}

export type CatalogReport = {
  builtAt: string;
  target: number;
  minimumReportedSalesExclusive: number;
  planned: number;
  /** Pages answered (from cache or a provider call made in this or an earlier request). */
  pagesFetched: number;
  pagesFailed: number;
  /** Pages not requested yet because of the per-request budget; later requests continue. */
  pagesPending: number;
  /** Pages skipped because the previous page of the same term was not full. */
  pagesSkippedExhausted: number;
  /** Pages skipped because enough publishable products were already found. */
  pagesSkippedTargetMet: number;
  pagesSkippedAfterError: number;
  pageSize: { tried: number[]; accepted: number | null };
  errorCodes: Record<string, number>;
  quotaStopped: boolean;
  rawRows: number;
  uniqueProducts: number;
  duplicates: number;
  /** Products rejected, counted once each by their first failing rule. */
  rejectedPrimary: Partial<Record<RejectReason, number>>;
  /** Every failing rule (a product can fail several). */
  rejectedAll: Partial<Record<RejectReason, number>>;
  rejectedTotal: number;
  published: number;
  /** How many ILS/Hebrew/linked products would pass at other sales thresholds (diagnostic only). */
  salesBands: { over500: number; over1000: number; over5000: number };
  totals: { term: string; category: string; totalRecordCount: number | null }[];
  shortfall: string[];
};

type FetchOutcome =
  | { ok: true; page: ProductPage }
  | { ok: false; code: string };

export type BuildOptions = {
  categories: readonly CategoryDef[];
  fetchPage: (item: PlanItem, pageSize: number) => Promise<ProductPage>;
  /** Learned page size (e.g. from an earlier run in this process). */
  knownPageSize?: number | null;
  now?: () => Date;
  policy?: Partial<typeof CATALOG_POLICY>;
};

const errCode = (e: unknown) =>
  typeof e === "object" && e && "code" in e && typeof (e as { code: unknown }).code === "string"
    ? (e as { code: string }).code
    : "UNKNOWN";
const isQuota = (code: string) => /ApiCallLimit|QUOTA|LIMIT|_429|HTTP_429/i.test(code);
const isDeferred = (code: string) => code === "CATALOG_DEFERRED";
const isBadParam = (code: string) => /INVALID_PARAMETER|isv\.invalid|PAGE_SIZE/i.test(code);

export async function buildCatalog(opts: BuildOptions): Promise<{ items: CatalogProduct[]; report: CatalogReport; acceptedPageSize: number | null }> {
  const policy = { ...CATALOG_POLICY, ...opts.policy };
  const plan = buildFetchPlan(opts.categories, policy.maxPagesPerTerm);
  const sizes = opts.knownPageSize ? [opts.knownPageSize] : [...policy.pageSizes];
  const tried: number[] = [];
  let sizeIndex = 0;
  let accepted: number | null = opts.knownPageSize ?? null;
  const errorCodes: Record<string, number> = {};
  const exhausted = new Set<string>(); // term keys whose last page was short
  const deferredTerms = new Set<string>();
  const failedTerms = new Set<string>();
  let skippedAfterError = 0;
  const termKey = (i: PlanItem) => i.categoryIndex + ":" + i.termIndex;
  const unique = new Map<string, CatalogProduct>();
  const order: string[] = [];
  const totals = new Map<string, { term: string; category: string; totalRecordCount: number | null }>();
  let rawRows = 0, duplicates = 0, pagesFetched = 0, pagesFailed = 0, pagesPending = 0;
  let skippedExhausted = 0, skippedTarget = 0, quotaStopped = false;
  const publishable = () => [...unique.values()].filter((p) => publicRejections(p, policy.minimumReportedSalesExclusive).length === 0).length;

  async function attempt(item: PlanItem): Promise<FetchOutcome> {
    for (;;) {
      const size = accepted ?? sizes[sizeIndex];
      if (!tried.includes(size)) tried.push(size);
      try {
        const page = await opts.fetchPage(item, size);
        accepted ??= size;
        return { ok: true, page };
      } catch (e) {
        const code = errCode(e);
        // Only the page-size probe retries; a known-good size is not second-guessed.
        if (accepted === null && isBadParam(code) && sizeIndex < sizes.length - 1) {
          sizeIndex++;
          continue;
        }
        return { ok: false, code };
      }
    }
  }

  let cursor = 0;
  while (cursor < plan.length && !quotaStopped) {
    // The first call alone establishes the accepted page size.
    const width = accepted === null ? 1 : policy.concurrency;
    const batch: PlanItem[] = [];
    while (batch.length < width && cursor < plan.length) {
      const item = plan[cursor];
      // A deeper page waits until the previous page of the same term is known.
      if (batch.some((b) => termKey(b) === termKey(item))) break;
      cursor++;
      if (item.pageNo > 1 && deferredTerms.has(termKey(item))) { pagesPending++; continue; }
      if (item.pageNo > 1 && failedTerms.has(termKey(item))) { skippedAfterError++; continue; }
      if (item.pageNo > 1 && exhausted.has(termKey(item))) { skippedExhausted++; continue; }
      if (publishable() >= policy.stopAt) { skippedTarget++; continue; }
      batch.push(item);
    }
    if (!batch.length) continue;
    const results = await Promise.all(batch.map(attempt));
    results.forEach((r, i) => {
      const item = batch[i];
      if (!r.ok) {
        if (isDeferred(r.code)) { pagesPending++; deferredTerms.add(termKey(item)); return; }
        errorCodes[r.code] = (errorCodes[r.code] ?? 0) + 1;
        pagesFailed++;
        failedTerms.add(termKey(item));
        if (isQuota(r.code)) quotaStopped = true;
        return;
      }
      pagesFetched++;
      const { products, meta } = r.page;
      if (item.pageNo === 1)
        totals.set(termKey(item), { term: item.term, category: opts.categories[item.categoryIndex].label, totalRecordCount: meta.totalRecordCount });
      if (products.length < meta.pageSize) exhausted.add(termKey(item));
      for (const p of products) {
        rawRows++;
        if (unique.has(p.id)) { duplicates++; continue; }
        const c = opts.categories[item.categoryIndex];
        unique.set(p.id, { ...p, images: p.images.slice(0, 5), category: c.label, categorySlug: c.slug });
        order.push(p.id);
      }
    });
  }
  // Remaining plan items after a quota stop are pending for a later run.
  if (quotaStopped) pagesPending += plan.length - cursor;

  const rejectedPrimary: Partial<Record<RejectReason, number>> = {};
  const rejectedAll: Partial<Record<RejectReason, number>> = {};
  const bands = { over500: 0, over1000: 0, over5000: 0 };
  const published: CatalogProduct[] = [];
  for (const id of order) {
    const p = unique.get(id)!;
    const reasons = publicRejections(p, policy.minimumReportedSalesExclusive);
    const nonSales = reasons.filter((r) => r !== "sales");
    if (!nonSales.length && p.orders !== null) {
      if (p.orders > 500) bands.over500++;
      if (p.orders > 1000) bands.over1000++;
      if (p.orders > 5000) bands.over5000++;
    }
    if (reasons.length) {
      rejectedPrimary[reasons[0]] = (rejectedPrimary[reasons[0]] ?? 0) + 1;
      for (const r of reasons) rejectedAll[r] = (rejectedAll[r] ?? 0) + 1;
    } else published.push(p);
  }
  // Within each category: highest reported sales first; categories interleaved.
  const byCat = new Map<string, CatalogProduct[]>();
  for (const p of published) byCat.set(p.categorySlug, [...(byCat.get(p.categorySlug) ?? []), p]);
  for (const list of byCat.values()) list.sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0));
  const lists = opts.categories.map((c) => byCat.get(c.slug) ?? []);
  const items: CatalogProduct[] = [];
  for (let row = 0; row < Math.max(0, ...lists.map((l) => l.length)); row++)
    for (const l of lists) if (l[row]) items.push(l[row]);

  const rejectedTotal = unique.size - published.length;
  const shortfall: string[] = [];
  if (items.length < policy.target) {
    shortfall.push(`פורסמו ${items.length} מוצרים, פחות מהיעד של ${policy.target}. לא הוספנו מוצרים חלשים או מומצאים כדי להשלים.`);
    if (rejectedPrimary.sales) shortfall.push(`${rejectedPrimary.sales} מוצרים נפסלו כי היו להם 5,000 מכירות מדווחות או פחות.`);
    if (rejectedAll.affiliate) shortfall.push(`${rejectedAll.affiliate} מוצרים נפסלו כי לא התקבל עבורם קישור שותפים תקין.`);
    if (rejectedAll.hebrew) shortfall.push(`${rejectedAll.hebrew} מוצרים נפסלו כי לא התקבלה כותרת בעברית.`);
    if (rejectedAll.currency) shortfall.push(`${rejectedAll.currency} מוצרים נפסלו כי המחיר לא הוחזר בשקלים.`);
    if (pagesPending) shortfall.push(`${pagesPending} עמודי תוצאות עדיין לא נשלפו. הקטלוג נבנה בהדרגה כדי לא לחרוג ממכסות ה־API, והמספר יגדל בביקורים הבאים.`);
    if (quotaStopped) shortfall.push("השליפה נעצרה בגלל מגבלת קריאות של ה־API. ננסה שוב במחזור הרענון הבא.");
    if (pagesFailed && !quotaStopped) shortfall.push(`${pagesFailed} עמודי תוצאות נכשלו בשליפה.`);
    if (!pagesPending && !quotaStopped && skippedExhausted) shortfall.push("חלק מביטויי החיפוש מוצו: הספק לא החזיר עמודים נוספים.");
    if (duplicates) shortfall.push(`${duplicates} תוצאות היו כפולות בין ביטויי חיפוש והוסרו.`);
  }
  return {
    items,
    acceptedPageSize: accepted,
    report: {
      builtAt: (opts.now?.() ?? new Date()).toISOString(),
      target: policy.target,
      minimumReportedSalesExclusive: policy.minimumReportedSalesExclusive,
      planned: plan.length,
      pagesFetched,
      pagesFailed,
      pagesPending,
      pagesSkippedExhausted: skippedExhausted,
      pagesSkippedTargetMet: skippedTarget,
      pagesSkippedAfterError: skippedAfterError,
      pageSize: { tried, accepted },
      errorCodes,
      quotaStopped,
      rawRows,
      uniqueProducts: unique.size,
      duplicates,
      rejectedPrimary,
      rejectedAll,
      rejectedTotal,
      published: items.length,
      salesBands: bands,
      totals: [...totals.values()],
      shortfall,
    },
  };
}
