import { NextResponse } from "next/server";
import { ALIEXPRESS_METHODS, getProductDetail } from "../../../../../lib/aliexpress";
import { jsonError, paramsFromSearch, rateLimitKey, shouldVerify, verificationResponse } from "../_shared";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldVerify(request)) {
    return verificationResponse("/api/aliexpress/product", ALIEXPRESS_METHODS.PRODUCT_DETAIL);
  }

  try {
    const result = await getProductDetail(paramsFromSearch(request), {
      rateLimitKey: rateLimitKey(request, "aliexpress-product"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
