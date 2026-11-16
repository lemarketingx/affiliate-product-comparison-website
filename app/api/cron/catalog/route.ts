import { timingSafeEqual } from "node:crypto";
import { configured } from "../../../../lib/aliexpress/affiliate";
import { runCatalogJobs, storeConfigured } from "../../../../lib/catalog-store/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. No secret = no access. */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const want = Buffer.from("Bearer " + secret, "utf8");
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ code: "UNAUTHORIZED" }, 401);
  if (!storeConfigured()) return json({ code: "STORE_NOT_CONFIGURED" }, 503);
  if (!configured()) return json({ code: "ALIEXPRESS_NOT_CONFIGURED" }, 503);
  try {
    const { discovery, prices } = await runCatalogJobs("cron", { deadlineMs: 50_000 });
    return json({
      discovery: { runId: discovery.runId, status: discovery.status, stats: discovery.stats, errorCodes: discovery.errorCodes },
      prices: { runId: prices.runId, status: prices.status, stats: prices.stats, errorCodes: prices.errorCodes },
    });
  } catch (e) {
    const code = e instanceof Error && /^[A-Z0-9_]{3,60}$/.test(e.message) ? e.message : "JOB_FAILED";
    return json({ code }, 500);
  }
}
