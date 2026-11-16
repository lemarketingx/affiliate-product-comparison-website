// Parameter profiles for aliexpress.affiliate.productdetail.get, from the
// richest request to the minimal one that passed the live probe on 2026-11-14
// (`product_ids` = one id, `country=IL`; docs/aliexpress-quality-probe-*.json).
// Live evidence 2026-11-16 (run #6): full, no_language and no_currency were
// rejected with 402 INVALID_PARAMETER and country_only was accepted. The only
// difference between no_currency (country + tracking_id) and country_only
// (country) is tracking_id, so tracking_id is the rejected parameter. Every
// earlier ILS attempt also carried tracking_id, so "ILS without tracking_id"
// has never been tried: it is now first, because an ILS answer lets the
// storefront keep shekel prices instead of showing USD. On INVALID_PARAMETER
// the job steps to the next profile; rejected profiles are logged and skipped
// for 30 days (dp_last_detail_profile), so each costs at most one call. Pure.
import type { AliProduct } from "./normalize.ts";
import { realSleep, withBanRetry } from "./pacer.ts";

export type DetailProfile = {
  name: string;
  /** Ids per call; 1 = one product per call. */
  batch: number;
  language: boolean;
  currency: "ILS" | "USD" | null;
  tracking: boolean;
};

export const DETAIL_PROFILES: readonly DetailProfile[] = [
  { name: "ils_no_tracking", batch: 20, language: true, currency: "ILS", tracking: false },
  { name: "usd_no_tracking", batch: 20, language: true, currency: "USD", tracking: false },
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
/**
 * Starts at the richest profile not rejected recently (rejections are
 * persisted from earlier runs), so a known-rejected profile costs no calls.
 */
export const newProfileState = (rejected: readonly string[] = []): ProfileState => {
  const i = DETAIL_PROFILES.findIndex((p) => !rejected.includes(p.name));
  return { index: i < 0 ? DETAIL_PROFILES.length - 1 : i, attempts: [] };
};
/** Profiles the provider answered with INVALID_PARAMETER in this run (to persist). */
export const rejectedProfiles = (state: ProfileState) =>
  [...new Set(state.attempts.filter((a) => a.code && /INVALID_PARAMETER/i.test(a.code)).map((a) => a.profile))];

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
  sleep: (ms: number) => Promise<void> = realSleep,
): Promise<{ products: AliProduct[]; missing: string[]; deferred: string[]; calls: number; profile: string }> {
  let calls = 0;
  for (;;) {
    const profile = DETAIL_PROFILES[state.index];
    const chunk = ids.slice(0, profile.batch);
    const deferred = ids.slice(profile.batch);
    try {
      // A short frequency ban is waited out once, if the budget allows the retry.
      const { value, calls: made } = await withBanRetry(
        () => call((pr, c) => detailParams(pr, c, trackingId), chunk, profile),
        () => calls + 1 < maxCalls,
        sleep,
      ).catch((e) => {
        calls += typeof e === "object" && e && "calls" in e ? Number((e as { calls: number }).calls) : 1;
        throw e;
      });
      calls += made;
      const { products } = value;
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
