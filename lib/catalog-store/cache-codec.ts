import { gzipSync, gunzipSync } from "node:zlib";

/**
 * Vercel/Next Data Cache rejects individual values over 2 MB. A catalog with
 * 800+ products, images and affiliate URLs crossed that limit, causing every
 * page view to query Supabase. Cache the same complete dataset as compressed
 * base64, so product images, current prices and URL integrity stay unchanged.
 *
 * Only use this with trusted server-side cache payloads; never decode user input.
 */
export function encodeCatalogCache<T>(rows: T): string {
  return gzipSync(JSON.stringify(rows), { level: 1 }).toString("base64");
}

export function decodeCatalogCache<T>(encoded: string): T {
  return JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8")) as T;
}
