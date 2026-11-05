import { readPortal, mutatePortal, apiFailure, sameOrigin, ApiError } from "../../../lib/portal-server";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await readPortal(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 20000) throw new ApiError(413, "הבקשה גדולה מדי.");
    const { action, payload } = await request.json() as { action: string; payload: Record<string, unknown> };
    await mutatePortal(action, payload ?? {});
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
