import { adminSession } from "../../../../lib/dealpilot/auth";
import {
  configured,
  AffiliateError,
  queryAffiliateProducts,
} from "../../../../lib/aliexpress/affiliate";
import { allowRequest } from "../../../../lib/dealpilot/rate-limit";
import { unstable_cache } from "next/cache";
import { sameRequestOrigin } from "../../../../lib/dealpilot/request-origin";
const cachedSearch = unstable_cache(
  async (term: string) => ({
    products: await queryAffiliateProducts(term, 10),
    fetchedAt: new Date().toISOString(),
  }),
  ["private-scout-v1", process.env.DEALPILOT_CACHE_NAMESPACE ?? "default"],
  { revalidate: 21600 },
);
export async function POST(request: Request) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!(await adminSession()))
    return Response.json(
      { ok: false, code: "UNAUTHORIZED" },
      { status: 401, headers },
    );
  if (!sameRequestOrigin(request))
    return Response.json(
      { ok: false, code: "INVALID_ORIGIN" },
      { status: 403, headers },
    );
  if (!allowRequest("scout-search", 5))
    return Response.json(
      { ok: false, code: "RATE_LIMITED" },
      { status: 429, headers },
    );
  if (!configured())
    return Response.json(
      { ok: false, code: "CREDENTIALS_MISSING" },
      { status: 503, headers },
    );
  const text = await request.text();
  if (text.length > 2048)
    return Response.json(
      { ok: false, code: "TOO_LARGE" },
      { status: 413, headers },
    );
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400, headers },
    );
  }
  const keywords =
    typeof body?.keywords === "string" ? body.keywords.trim() : "";
  if (
    keywords.length < 2 ||
    keywords.length > 60 ||
    /[\x00-\x1f]/.test(keywords)
  )
    return Response.json(
      { ok: false, code: "INVALID_KEYWORDS" },
      { status: 400, headers },
    );
  try {
    const result = await cachedSearch(keywords);
    return Response.json(
      {
        ok: true,
        source: "aliexpress_affiliate_api",
        ...result,
        count: result.products.length,
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        code: error instanceof AffiliateError ? error.code : "UNAVAILABLE",
      },
      { status: 503, headers },
    );
  }
}
