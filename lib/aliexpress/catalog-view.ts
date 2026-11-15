// Pure filtering, search and pagination for the public catalog pages.
import { CATALOG_POLICY } from "./catalog-build.ts";

export type SortKey = "popular" | "orders" | "price-asc" | "price-desc";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "מומלץ (מגוון קטגוריות)" },
  { key: "orders", label: "הכי הרבה מכירות מדווחות" },
  { key: "price-asc", label: "מחיר: מהנמוך לגבוה" },
  { key: "price-desc", label: "מחיר: מהגבוה לנמוך" },
];
export type ViewParams = { q: string; cat: string; sort: SortKey; page: number; tax?: "" | "exempt" };
type Item = { title: string; categorySlug: string; orders: number | null; price: string | null; shopName?: string | null };

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
export function parseViewParams(raw: Record<string, unknown>, validCats: readonly string[]): ViewParams {
  const q = String(one(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const catRaw = String(one(raw.cat) ?? "");
  const sortRaw = String(one(raw.sort) ?? "");
  const pageRaw = Number(one(raw.page));
  return {
    q,
    cat: validCats.includes(catRaw) ? catRaw : "",
    sort: (SORTS.some((s) => s.key === sortRaw) ? sortRaw : "popular") as SortKey,
    page: Number.isSafeInteger(pageRaw) && pageRaw >= 1 && pageRaw <= 10000 ? pageRaw : 1,
    tax: one(raw.tax) === "exempt" ? "exempt" : "",
  };
}

const norm = (s: string) =>
  s.toLocaleLowerCase("he").replace(/[֑-ׇ]/g, "").replace(/[״׳"'`]/g, "").replace(/\s+/g, " ").trim();

export function filterCatalog<T extends Item>(items: readonly T[], p: ViewParams, perPage: number = CATALOG_POLICY.perPage) {
  const words = norm(p.q).split(" ").filter(Boolean);
  const rows = items.filter(
    (it) =>
      (!p.cat || it.categorySlug === p.cat) &&
      words.every((w) => norm(it.title + " " + (it.shopName ?? "")).includes(w)),
  );
  const price = (it: Item) => (Number.isFinite(Number(it.price)) ? Number(it.price) : NaN);
  if (p.sort === "orders") rows.sort((a, b) => (b.orders ?? -1) - (a.orders ?? -1));
  if (p.sort === "price-asc") rows.sort((a, b) => price(a) - price(b));
  if (p.sort === "price-desc") rows.sort((a, b) => price(b) - price(a));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(p.page, pages);
  const start = (page - 1) * perPage;
  return { items: rows.slice(start, start + perPage), total, page, pages, start, perPage };
}

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
export function pageWindow(page: number, pages: number, radius = 2): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= radius) out.push(i);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

export function viewHref(base: string, p: Partial<ViewParams>, lockedCat = false): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.cat && !lockedCat) sp.set("cat", p.cat);
  if (p.sort && p.sort !== "popular") sp.set("sort", p.sort);
  if (p.tax === "exempt") sp.set("tax", "exempt");
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return base + (qs ? "?" + qs : "");
}
