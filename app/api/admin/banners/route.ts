import { adminSession } from "../../../../lib/dealpilot/auth";
import { allowRequest } from "../../../../lib/dealpilot/rate-limit";
import { sameRequestOrigin } from "../../../../lib/dealpilot/request-origin";
import { getBannerSnapshot, redirectChecks, verifyRedirect } from "../../../../lib/aliexpress/banners";

export const runtime = "nodejs";
// Admin-only: follow the generated links of up to 6 published banners and record where they land.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await adminSession())) return Response.json({ code: "UNAUTHORIZED" }, { status: 401, headers });
  if (!sameRequestOrigin(request)) return Response.json({ code: "INVALID_ORIGIN" }, { status: 403, headers });
  if (!allowRequest("banner-verify", 6)) return Response.json({ code: "RATE_LIMITED" }, { status: 429, headers });
  const snap = await getBannerSnapshot();
  const targets = snap.banners.filter((b) => b.status === "published" && b.link).slice(0, 6);
  const results = [];
  for (const b of targets) {
    const r = await verifyRedirect(b.link!);
    const entry = { ...r, checkedAt: new Date().toISOString() };
    redirectChecks.set(b.id, entry);
    results.push({ id: b.id, ...entry });
  }
  return Response.json({ checked: results.length, ok: results.filter((r) => r.ok).length, results }, { headers });
}
