import { NextRequest, NextResponse } from "next/server";

import { AliExpressError, debugAliExpressMinimalProductQuery } from "@/lib/aliexpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get("q") || "gaming";
    const debug = await debugAliExpressMinimalProductQuery(keyword);

    return NextResponse.json({ ok: true, debug });
  } catch (error) {
    if (error instanceof AliExpressError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ALIEXPRESS_DEBUG_ERROR",
          message: "אירעה שגיאה בזמן בדיקת חתימת AliExpress.",
        },
      },
      { status: 500 },
    );
  }
}
