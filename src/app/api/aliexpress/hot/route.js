import { NextResponse } from "next/server";
import { ALIEXPRESS_METHODS, getHotProducts } from "../../../../../lib/aliexpress";
import { jsonError, paramsFromSearch, rateLimitKey, shouldVerify, verificationResponse } from "../_shared";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldVerify(request)) {
    return verificationResponse("/api/aliexpress/hot", ALIEXPRESS_METHODS.HOT_PRODUCT_QUERY);
  }

  try {
    const result = await getHotProducts(paramsFromSearch(request), {
      rateLimitKey: rateLimitKey(request, "aliexpress-hot"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
