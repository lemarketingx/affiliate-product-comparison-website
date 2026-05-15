import { NextRequest, NextResponse } from "next/server";

import { AliExpressError, getProductDetails } from "@/lib/aliexpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const products = await getProductDetails(Object.fromEntries(request.nextUrl.searchParams.entries()));

    return NextResponse.json({ ok: true, product: products[0] ?? null });
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
        message: "אירעה שגיאה בשרת בזמן טעינת פרטי מוצר.",
      },
    },
    { status: 500 },
  );
}

