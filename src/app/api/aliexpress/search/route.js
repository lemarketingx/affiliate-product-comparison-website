import { NextResponse } from "next/server";
import { ALIEXPRESS_METHODS, searchProducts } from "../../../../../lib/aliexpress";
import { jsonError, paramsFromSearch, rateLimitKey, shouldVerify, verificationResponse } from "../_shared";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldVerify(request)) {
    return verificationResponse("/api/aliexpress/search", ALIEXPRESS_METHODS.PRODUCT_QUERY);
  }

  try {
    const result = await searchProducts(paramsFromSearch(request), {
      rateLimitKey: rateLimitKey(request, "aliexpress-search"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
