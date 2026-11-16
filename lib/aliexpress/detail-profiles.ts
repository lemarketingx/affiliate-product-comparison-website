// Parameter profiles for aliexpress.affiliate.productdetail.get, from the
// richest request to the minimal one that passed the live probe on 2026-11-14
// (`product_ids` = one id, `country=IL`; docs/aliexpress-quality-probe-*.json).
// The first live price-refresh runs (2026-11-16) failed every batch with
// PROVIDER_RESULT_402_INVALID_PARAMETER, first with target_currency=ILS and
// then with USD, so the rejected parameter is not known yet. On an
// INVALID_PARAMETER answer the job steps to the next profile (one parameter
// removed at a time) and records which profile the provider accepted. Pure.
import type { AliProduct } from "./normalize.ts";

export type DetailProfile = {
  name: string;
  /** Ids per call; 1 = one product per call. */
  batch: number;
  language: boolean;
  currency: "USD" | null;
  tracking: boolean;
};

export const DETAIL_PROFILES: readonly DetailProfile[] = [
  { name: "full", batch: 20, language: true, currency: "USD", tracking: true },
  { name: "no_language", batch: 20, language: false, currency: "USD", tracking: true },
  { name: "no_currency", batch: 20, language: false, currency: null, tracking: true },
  { name: "country_only", batch: 20, language: false, currency: null, tracking: false },
  // Exactly the request shape that succeeded live: a single id and country=IL.
  { name: "probe_single", batch: 1, language: false, currency: null, tracking: false },
];

export function detailParams(profile: DetailProfile, ids: string[], trackingId: string | null): Record<string, string> {
  const p: Record<string, string> = { product_ids: ids.join(","), country: "IL" };
  if (profile.currency) p.target_currency = profile.currency;
  if (profile.language) p.target_language = "HE";
  if (profile.tracking && trackingId) p.tracking_id = trackingId;
  return p;
}

const codeOf = (e: unknown) =>
  typeof e === "object" && e && "code" in e && typeof (e as { code: unknown }).code === "string" ? (e as { code: string }).code : "";
export const isInvalidParameter = (e: unknown) => /INVALID_PARAMETER|isv\.invalid|InvalidParameter/i.test(codeOf(e));

export type DetailAttempt = { profile: string; ids: number; code: string | null; detail: string | null };
export type ProfileState = { index: number; attempts: DetailAttempt[] };
export const newProfileState = (): ProfileState => ({ index: 0, attempts: [] });

/**
 * Fetches details for `ids` with the current profile; on INVALID_PARAMETER
 * moves to the next profile and retries (bounded by `maxCalls`). A profile
 * with a smaller batch splits the ids; only the first chunk is fetched in this
 * call and the rest is reported as `deferred` (not missing) for later.
 */
export async function fetchDetailsAdaptive(
  ids: string[],
  state: ProfileState,
  call: (params: (profile: DetailProfile, chunk: string[]) => Record<string, string>, chunk: string[], profile: DetailProfile) => Promise<{ products: AliProduct[] }>,
  maxCalls: number,
  trackingId: string | null,
): Promise<{ products: AliProduct[]; missing: string[]; deferred: string[]; calls: number; profile: string }> {
  let calls = 0;
  for (;;) {
    const profile = DETAIL_PROFILES[state.index];
    const chunk = ids.slice(0, profile.batch);
    const deferred = ids.slice(profile.batch);
    calls++;
    try {
      const { products } = await call((pr, c) => detailParams(pr, c, trackingId), chunk, profile);
      state.attempts.push({ profile: profile.name, ids: chunk.length, code: null, detail: null });
      const got = new Set(products.map((p) => p.id));
      return { products: products.filter((p) => chunk.includes(p.id)), missing: chunk.filter((id) => !got.has(id)), deferred, calls, profile: profile.name };
    } catch (e) {
      const detail = typeof e === "object" && e && "detail" in e ? ((e as { detail: unknown }).detail as string | null) : null;
      state.attempts.push({ profile: profile.name, ids: chunk.length, code: codeOf(e) || "UNKNOWN", detail });
      if (isInvalidParameter(e) && state.index < DETAIL_PROFILES.length - 1 && calls < maxCalls) {
        state.index++;
        continue;
      }
      // Report every provider call made, so the caller's budget stays exact.
      if (typeof e === "object" && e) (e as { calls?: number }).calls = calls;
      throw e;
    }
  }
}
