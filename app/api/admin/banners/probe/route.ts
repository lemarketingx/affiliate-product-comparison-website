import { adminSession } from "../../../../../lib/dealpilot/auth";
import { allowRequest } from "../../../../../lib/dealpilot/rate-limit";
import { sameRequestOrigin } from "../../../../../lib/dealpilot/request-origin";
import { getBannerSnapshot, probeLinkGenerate } from "../../../../../lib/aliexpress/banners";
import { getCatalog } from "../../../../../lib/aliexpress/catalog";

export const runtime = "nodejs";
// Admin-only: isolate which link.generate parameter the provider rejects.
// At most 5 provider calls per probe; output never contains keys, the tracking id or full links.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await adminSession())) return Response.json({ code: "UNAUTHORIZED" }, { status: 401, headers });
  if (!sameRequestOrigin(request)) return Response.json({ code: "INVALID_ORIGIN" }, { status: 403, headers });
  if (!allowRequest("banner-probe", 3)) return Response.json({ code: "RATE_LIMITED" }, { status: 429, headers });
  const snap = await getBannerSnapshot();
  const banner = snap.banners.find((b) => b.originalSource || b.sourceUrl);
  let source = banner?.originalSource ?? banner?.sourceUrl ?? null;
  let origin = "מקור של באנר קמפיין";
  if (!source) {
    // Fall back to a product URL that already works for the product search.
    const catalog = await getCatalog();
    source = catalog.items.find((p) => p.productUrl)?.productUrl ?? null;
    origin = "כתובת מוצר מהקטלוג";
  }
  if (!source) return Response.json({ code: "NO_SOURCE" }, { status: 409, headers });
  const result = await probeLinkGenerate(source);
  return Response.json({ origin, ...result }, { headers });
}
