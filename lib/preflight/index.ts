import { PRODUCT_TYPES } from "./product-types.ts";
import { visibility } from "./approvals.ts";
import type { ProductType } from "./types.ts";

export type VisibleType = ProductType & { status: "approved" | "draft" };

export function visibleTypes(env?: Record<string, string | undefined>): VisibleType[] {
  return PRODUCT_TYPES.flatMap((t) => {
    const v = visibility("type:" + t.id, env);
    return v.visible ? [{ ...t, status: v.status }] : [];
  });
}
export function findVisibleType(id: string, env?: Record<string, string | undefined>) {
  return visibleTypes(env).find((t) => t.id === id) ?? null;
}
export { PRODUCT_TYPES };
