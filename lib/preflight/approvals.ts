// Owner approval of public content. Everything is a draft until listed here.
// To publish: add an entry, e.g. "type:dashcam": { approvedAt: "2026-11-20", by: "owner" }.
export const APPROVALS: Record<string, { approvedAt: string; by: string }> = {};

export type Visibility = { status: "approved" | "draft"; visible: boolean };

/** Drafts are visible only in development or when explicitly enabled for QA. */
export function draftsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development" || env.DEALPILOT_SHOW_DRAFTS === "true";
}

export function visibility(key: string, env?: Record<string, string | undefined>): Visibility {
  const approved = Object.prototype.hasOwnProperty.call(APPROVALS, key);
  return { status: approved ? "approved" : "draft", visible: approved || draftsEnabled(env) };
}
