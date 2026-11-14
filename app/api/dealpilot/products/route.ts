import { adminReady, AffiliateError, configured, queryAffiliateProducts, validAdminToken } from "../../../../lib/aliexpress/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"no-store, max-age=0", "X-Content-Type-Options":"nosniff"};

export async function POST(request: Request) {
  // This is a private diagnostic endpoint, never a public search API.
  if (!adminReady()) return Response.json({ok:false,code:"ADMIN_TOKEN_NOT_CONFIGURED"},{status:503,headers});
  if (!validAdminToken(request.headers.get("x-dealpilot-admin-token")))
    return Response.json({ok:false,code:"UNAUTHORIZED"},{status:401,headers});
  if (!configured()) return Response.json({ok:false,code:"CREDENTIALS_MISSING"},{status:503,headers});
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return Response.json({ok:false,code:"PAYLOAD_TOO_LARGE"},{status:413,headers});
  let body:unknown;
  try { body = await request.json(); } catch {
    return Response.json({ok:false,code:"INVALID_JSON"},{status:400,headers});
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ok:false,code:"INVALID_BODY"},{status:400,headers});
  const input = body as Record<string,unknown>;
  const keywords = typeof input.keywords === "string" ? input.keywords.trim() : "";
  if (keywords.length < 2 || keywords.length > 60 || /[\x00-\x1f]/.test(keywords))
    return Response.json({ok:false,code:"INVALID_KEYWORDS"},{status:400,headers});
  try {
    const products = await queryAffiliateProducts(keywords,10);
    return Response.json({ok:true,source:"aliexpress_affiliate_api",products,count:products.length,affiliateTrackingConfigured:Boolean(process.env.ALIEXPRESS_TRACKING_ID?.trim())},{headers});
  } catch (err) {
    const code=err instanceof AffiliateError?err.code:"INTERNAL_ERROR";
    const status=err instanceof AffiliateError?err.status:500;
    return Response.json({ok:false,code},{status,headers});
  }
}
