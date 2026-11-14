import NextAuth from "next-auth";
import { authOptions, authConfigured } from "../../../../lib/dealpilot/auth";
import { allowRequest } from "../../../../lib/dealpilot/rate-limit";
const handler = NextAuth(authOptions);
async function guarded(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (!authConfigured())
    return Response.json({ code: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  if (!allowRequest("oauth", 60))
    return Response.json(
      { code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  const params = await context.params;
  return handler(request, { params });
}
export { guarded as GET, guarded as POST };
