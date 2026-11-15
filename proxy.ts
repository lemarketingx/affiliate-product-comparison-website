import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { allowedAdminId, authConfigured } from "./lib/dealpilot/auth-policy";
import { allowRequest } from "./lib/dealpilot/rate-limit";
const legacy = [
  "/join",
  "/setup",
  "/sign-in",
  "/reset-password",
  "/r",
  "/auth",
  "/api/website-import",
  "/api/setup",
  "/api/campaign",
  "/api/referral-visit",
  "/api/referrals",
  "/api/portal",
];
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (legacy.some((p) => path === p || path.startsWith(p + "/")))
    return new NextResponse("Not available in DealPilot", { status: 404 });
  if (
    ((path === "/admin" || path.startsWith("/admin/")) &&
      path !== "/admin/login") ||
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/dealpilot/")
  ) {
    const token = authConfigured()
      ? await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
      : null;
    if (
      !allowedAdminId(
        token?.adminGithubId,
        process.env.DEALPILOT_ADMIN_GITHUB_IDS,
      )
    ) {
      if (path.startsWith("/api/"))
        return NextResponse.json(
          { code: "UNAUTHORIZED" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  if (path === "/admin/login" && !allowRequest("login-page", 120))
    return new NextResponse("Too many attempts", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  const response = NextResponse.next();
  if (path.startsWith("/admin") || path.startsWith("/api/"))
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
