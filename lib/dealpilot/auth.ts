import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { redirect } from "next/navigation";
import { allowedAdminId, authConfigured } from "./auth-policy";
export { authConfigured } from "./auth-policy";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      checks: ["pkce", "state"],
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    async signIn({ account }) {
      return (
        authConfigured() &&
        account?.provider === "github" &&
        allowedAdminId(
          account.providerAccountId,
          process.env.DEALPILOT_ADMIN_GITHUB_IDS,
        )
      );
    },
    async jwt({ token, account }) {
      if (account) token.adminGithubId = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (
        !allowedAdminId(
          token.adminGithubId,
          process.env.DEALPILOT_ADMIN_GITHUB_IDS,
        )
      )
        session.user = undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url === baseUrl + "/admin/dashboard" || url === "/admin/dashboard"
        ? baseUrl + "/admin/dashboard"
        : baseUrl + "/admin/login";
    },
  },
  logger: {
    error() {
      console.error("DealPilot authentication failed");
    },
    warn() {},
    debug() {},
  },
};
export async function adminSession() {
  if (!authConfigured()) return null;
  const session = await getServerSession(authOptions);
  return session?.user ? session : null;
}
export async function requireAdmin() {
  const session = await adminSession();
  if (!session) redirect("/admin/login");
  return session;
}
