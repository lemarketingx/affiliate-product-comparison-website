import { NextResponse } from "next/server";
import {
  buildRateLimitKey,
  getAliExpressVerification,
  normalizeRouteError,
} from "../../../../lib/aliexpress";

export const runtime = "nodejs";

export function verificationResponse(route, method) {
  return NextResponse.json({
    ok: true,
    route,
    method,
    verification: getAliExpressVerification(),
    sampleMapping: {
      title: "product title",
      image: "product image URL",
      currentPrice: "current sale price",
      originalPrice: "original list price",
      rating: "rating or evaluation rate",
      orders: "order volume",
      affiliateLink: "tracked affiliate URL",
    },
  });
}

export function shouldVerify(request) {
  return request.nextUrl.searchParams.get("verify") === "1";
}

export function jsonError(error) {
  const normalized = normalizeRouteError(error);
  return NextResponse.json(normalized.body, { status: normalized.status });
}

export function rateLimitKey(request, route) {
  return buildRateLimitKey(request, route);
}

export function paramsFromSearch(request) {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}
