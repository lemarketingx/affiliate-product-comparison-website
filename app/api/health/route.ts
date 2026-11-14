export async function GET() {
  return Response.json(
    { status: "ready", service: "dealpilot" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
