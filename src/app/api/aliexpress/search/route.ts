import { NextRequest, NextResponse } from "next/server";

import { AliExpressError, searchProducts } from "@/lib/aliexpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const products = await searchProducts(Object.fromEntries(request.nextUrl.searchParams.entries()));

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    return aliExpressErrorResponse(error);
  }
}

function aliExpressErrorResponse(error: unknown) {
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
        code: "SERVER_ERROR",
        message: "אירעה שגיאה בשרת בזמן חיפוש מוצרים.",
      },
    },
    { status: 500 },
  );
}

