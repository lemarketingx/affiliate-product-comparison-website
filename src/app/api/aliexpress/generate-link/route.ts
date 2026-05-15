import { NextRequest, NextResponse } from "next/server";

import { AliExpressError, generateAffiliateLinks } from "@/lib/aliexpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const links = await generateAffiliateLinks(Object.fromEntries(request.nextUrl.searchParams.entries()));

    return NextResponse.json({ ok: true, links });
  } catch (error) {
    return aliExpressErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const links = await generateAffiliateLinks(body);

    return NextResponse.json({ ok: true, links });
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
        message: "אירעה שגיאה בשרת בזמן יצירת קישור אפיליאייט.",
      },
    },
    { status: 500 },
  );
}

