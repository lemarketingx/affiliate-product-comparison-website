// Owner approval of public content. Everything is a draft until listed here.
// To publish: add an entry, e.g. "type:dashcam": { approvedAt: "2026-11-20", by: "owner" }.
const OWNER_APPROVAL = { approvedAt: "2026-11-15", by: "owner" } as const;

// Approved by the site owner on 2026-11-15 ("מאשר הכל"): all destinations and guides.
// Claims marked "נדרש אימות" keep their label after approval.
export const APPROVALS: Record<string, { approvedAt: string; by: string }> = Object.fromEntries(
  [
    "type:security-recorder", "type:wireless-camera", "type:dashcam", "type:smart-home", "type:charger",
    "type:powerbank", "type:earbuds", "type:smartwatch", "type:car-gadgets", "type:led-lighting",
    "type:grooming", "type:clothing", "type:kids-toys", "type:safety-gear",
    "guide:plugs-power", "guide:cellular-sim", "guide:shipping-customs", "guide:warranty-returns", "guide:dont-order",
  ].map((key) => [key, OWNER_APPROVAL]),
);

export type Visibility = { status: "approved" | "draft"; visible: boolean };

/** Drafts are visible only in development or when explicitly enabled for QA. */
export function draftsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development" || env.DEALPILOT_SHOW_DRAFTS === "true";
}

export function visibility(key: string, env?: Record<string, string | undefined>): Visibility {
  const approved = Object.prototype.hasOwnProperty.call(APPROVALS, key);
  return { status: approved ? "approved" : "draft", visible: approved || draftsEnabled(env) };
}
