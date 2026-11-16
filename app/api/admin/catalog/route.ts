import { adminSession } from "../../../../lib/dealpilot/auth";
import { allowRequest } from "../../../../lib/dealpilot/rate-limit";
import { sameRequestOrigin } from "../../../../lib/dealpilot/request-origin";
import { configured } from "../../../../lib/aliexpress/affiliate";
import { isCatalogJob, runCatalogJobs, setUnpublished, storeConfigured } from "../../../../lib/catalog-store/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Admin-only catalog actions: run the import now, unpublish/republish a product.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const fail = (code: string, status: number) => Response.json({ code }, { status, headers });
  if (!(await adminSession())) return fail("UNAUTHORIZED", 401);
  if (!sameRequestOrigin(request)) return fail("INVALID_ORIGIN", 403);
  if (!storeConfigured()) return fail("STORE_NOT_CONFIGURED", 503);
  let body: { action?: unknown; productId?: unknown; job?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", 400);
  }
  try {
    if (body.action === "run") {
      if (!configured()) return fail("ALIEXPRESS_NOT_CONFIGURED", 503);
      const job = body.job === undefined ? "all" : body.job;
      if (!isCatalogJob(job)) return fail("UNKNOWN_JOB", 400);
      if (!allowRequest("admin-catalog-run", 4)) return fail("RATE_LIMITED", 429);
      const { discovery, prices, links } = await runCatalogJobs("manual", { deadlineMs: 50_000, job });
      return Response.json(
        {
          job,
          discovery: discovery && { status: discovery.status, stats: discovery.stats },
          prices: prices && { status: prices.status, stats: prices.stats },
          links: links && { status: links.status, stats: links.stats },
        },
        { headers },
      );
    }
    if (body.action === "unpublish" || body.action === "republish") {
      const id = typeof body.productId === "string" ? body.productId : "";
      if (!/^\d{4,24}$/.test(id)) return fail("INVALID_PRODUCT", 400);
      await setUnpublished(id, body.action === "unpublish");
      return Response.json({ ok: true }, { headers });
    }
    return fail("UNKNOWN_ACTION", 400);
  } catch (e) {
    const code = e instanceof Error && /^[A-Z0-9_]{3,60}$/.test(e.message) ? e.message : "ACTION_FAILED";
    return fail(code, code === "RUN_IN_PROGRESS" ? 409 : 500);
  }
}
