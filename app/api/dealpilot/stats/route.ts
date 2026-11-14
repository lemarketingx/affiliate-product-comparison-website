import { adminReady, validAdminToken } from "../../../../lib/aliexpress/affiliate";
import { clickSummary } from "../../../../lib/dealpilot/tracking";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, max-age=0", "X-Content-Type-Options":"nosniff"};
export async function POST(request:Request) {
  if (!adminReady()) return Response.json({ok:false,code:"ADMIN_TOKEN_NOT_CONFIGURED"},{status:503,headers});
  if (!validAdminToken(request.headers.get("x-dealpilot-admin-token")))
    return Response.json({ok:false,code:"UNAUTHORIZED"},{status:401,headers});
  const summary=await clickSummary();
  return Response.json({ok:true,trackingReady:summary.ready,totalClicks:summary.total,bySource:summary.bySource},{headers});
}
