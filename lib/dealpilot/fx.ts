import "server-only";
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

export async function getUsdRate(): Promise<UsdRate | null> {
  try {
    return await Promise.race([cached(), new Promise<null>((r) => setTimeout(() => r(null), 2500))]);
  } catch {
    return null;
  }
}
