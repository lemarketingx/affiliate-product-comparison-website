// Provider call pacing (pure, unit-tested).
// Live evidence 2026-11-16 run #6: a productdetail.get call made right after
// another was answered with ApiCallLimit "Api access frequency exceeds the
// limit. this ban will last 1 seconds" — a per-second frequency limit, not
// the daily quota. Calls are therefore spaced, and a short ban is waited out
// once (the retry is a real call and counts against the job's budget).

export const MIN_INTERVAL_MS = 1100;
/** Longest ban we are willing to wait out inside a serverless run. */
export const MAX_BAN_WAIT_MS = 10_000;

/** Seconds of a provider frequency ban, from its (sanitised) message; null if not a short ban. */
export function banSeconds(e: unknown): number | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  const detail = typeof e === "object" && e && "detail" in e ? String((e as { detail: unknown }).detail ?? "") : "";
  if (!/ApiCallLimit|frequency|HTTP_429/i.test(code + " " + detail)) return null;
  const m = /ban will last (\d{1,4}) ?second/i.exec(detail);
  if (!m) return null;
  const s = Number(m[1]);
  return s * 1000 + 250 <= MAX_BAN_WAIT_MS ? s : null;
}

export const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Serialises calls in this process with at least `minIntervalMs` between
 * their starts. Concurrent callers queue; nothing is dropped.
 */
export function createPacer(minIntervalMs: number = MIN_INTERVAL_MS, now: () => number = Date.now, sleep = realSleep) {
  let next = 0;
  let chain: Promise<unknown> = Promise.resolve();
  return function pace<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = next - now();
      if (wait > 0) await sleep(wait);
      next = now() + minIntervalMs;
      return fn();
    });
    chain = run.catch(() => undefined);
    return run;
  };
}

/**
 * Runs `call`; on a short provider frequency ban waits it out and retries
 * once, if the budget allows. Returns the result and how many calls were made.
 */
export async function withBanRetry<T>(
  call: () => Promise<T>,
  canRetry: () => boolean,
  sleep: (ms: number) => Promise<void> = realSleep,
): Promise<{ value: T; calls: number }> {
  try {
    return { value: await call(), calls: 1 };
  } catch (e) {
    const s = banSeconds(e);
    if (s === null || !canRetry()) {
      if (typeof e === "object" && e) (e as { calls?: number }).calls = 1;
      throw e;
    }
    await sleep(s * 1000 + 250);
    try {
      return { value: await call(), calls: 2 };
    } catch (e2) {
      if (typeof e2 === "object" && e2) (e2 as { calls?: number }).calls = 2;
      throw e2;
    }
  }
}
