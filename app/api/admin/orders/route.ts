import { adminSession } from "../../../../lib/dealpilot/auth";
import { allowRequest } from "../../../../lib/dealpilot/rate-limit";
import { getOrderReport } from "../../../../lib/aliexpress/orders";
import { sameRequestOrigin } from "../../../../lib/dealpilot/request-origin";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await adminSession()))
    return Response.json({ code: "UNAUTHORIZED" }, { status: 401, headers });
  if (!sameRequestOrigin(request))
    return Response.json({ code: "INVALID_ORIGIN" }, { status: 403, headers });
  if (!allowRequest("order-report", 3))
    return Response.json({ code: "RATE_LIMITED" }, { status: 429, headers });
  const raw = await request.text();
  if (raw.length > 2048)
    return Response.json({ code: "TOO_LARGE" }, { status: 413, headers });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ code: "INVALID_JSON" }, { status: 400, headers });
  }
  if (
    !body ||
    typeof body.startTime !== "string" ||
    typeof body.endTime !== "string" ||
    !["Payment Completed", "Buyer Confirmed Receipt"].includes(body.status)
  )
    return Response.json({ code: "INVALID_INPUT" }, { status: 400, headers });
  return Response.json(await getOrderReport(body), { headers });
}
