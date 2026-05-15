import { NextResponse } from "next/server";
import {
  ALIEXPRESS_METHODS,
  generateAffiliateLink,
  readJsonBody,
} from "../../../../../lib/aliexpress";
import { jsonError, rateLimitKey, shouldVerify, verificationResponse } from "../_shared";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldVerify(request)) {
    return verificationResponse("/api/aliexpress/generate-link", ALIEXPRESS_METHODS.LINK_GENERATE);
  }

  try {
    const result = await generateAffiliateLink(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
      {
        rateLimitKey: rateLimitKey(request, "aliexpress-link"),
      },
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const result = await generateAffiliateLink(await readJsonBody(request), {
      rateLimitKey: rateLimitKey(request, "aliexpress-link"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
