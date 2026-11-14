import { adminSession } from "../../../../lib/dealpilot/auth";
export async function POST() {
  if (!(await adminSession()))
    return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  return Response.json(
    {
      trackingReady: false,
      totalClicks: null,
      bySource: [],
      reason: "TRACKING_DISABLED",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
