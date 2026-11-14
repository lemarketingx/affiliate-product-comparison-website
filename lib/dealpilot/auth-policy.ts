export function allowedAdminId(id: unknown, allowlist: string | undefined) {
  return (
    typeof id === "string" &&
    /^\d+$/.test(id) &&
    (allowlist ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(id)
  );
}
export function authConfigured() {
  return Boolean(
    process.env.GITHUB_ID &&
      process.env.GITHUB_SECRET &&
      process.env.NEXTAUTH_SECRET &&
      process.env.NEXTAUTH_SECRET.length >= 32 &&
      process.env.DEALPILOT_ADMIN_GITHUB_IDS?.trim(),
  );
}
