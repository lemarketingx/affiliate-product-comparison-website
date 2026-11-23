import "server-only";
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import type { UsdRate } from "../preflight/tax-estimate";

// Bank of Israel representative USD/ILS rate (public API). Cached 6 hours; on
// any failure the tax estimate is shown as "not computed" — never a guessed rate.
const BOI_URL = "https://boi.org.il/PublicApi/GetExchangeRate?key=USD";

const cached = unstable_cache(
  async (): Promise<UsdRate | null> => {
    if (process.env.DEALPILOT_FX_DISABLED === "true") return null;
    const res = await fetch(BOI_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("FX_HTTP_" + res.status);
    const json = (await res.json()) as { key?: unknown; currentExchangeRate?: unknown; unit?: unknown; lastUpdate?: unknown };
    const rate = Number(json.currentExchangeRate);
    const unit = Number(json.unit ?? 1);
    const date = typeof json.lastUpdate === "string" ? json.lastUpdate : null;
    if (json.key !== "USD" || !Number.isFinite(rate) || rate < 1 || rate > 10 || unit !== 1 || !date) throw new Error("FX_INVALID");
    return { rate, date, source: "בנק ישראל, שער יציג" };
  },
  ["dealpilot-fx-usd-ils-v1", process.env.DEALPILOT_CACHE_NAMESPACE ?? "default"],
  { revalidate: 21600 },
);

/** A slow central-bank response must not block every public page for 2.5 s.
 * Continue the cached lookup after the response so the next request can use it.
 * Never use an invented or stale fallback exchange rate. */
export async function getUsdRate(): Promise<UsdRate | null> {
  const pending = cached().catch(() => null);
  const outcome = await Promise.race([
    pending.then((value) => ({ completed: true as const, value })),
    new Promise<{ completed: false }>((resolve) => setTimeout(() => resolve({ completed: false }), 700)),
  ]);
  if (outcome.completed) return outcome.value;
  try {
    after(() => pending.then(() => undefined));
  } catch {
    // Fetch may finish naturally outside a request scope.
  }
  return null;
}
