import { NextResponse } from "next/server";
import { getAliExpressConfig, AliExpressError, getHotProducts } from "@/lib/aliexpress";

export const runtime = "nodejs";

export async function GET() {
  const envCheck = {
    ALIEXPRESS_APP_KEY: Boolean(process.env.ALIEXPRESS_APP_KEY?.trim()),
    ALIEXPRESS_APP_SECRET: Boolean(process.env.ALIEXPRESS_APP_SECRET?.trim()),
    ALIEXPRESS_TRACKING_ID: Boolean(process.env.ALIEXPRESS_TRACKING_ID?.trim()),
    ALIEXPRESS_API_URL: process.env.ALIEXPRESS_API_URL?.trim() || "(default)",
  };

  const allEnvPresent = envCheck.ALIEXPRESS_APP_KEY && envCheck.ALIEXPRESS_APP_SECRET && envCheck.ALIEXPRESS_TRACKING_ID;

  if (!allEnvPresent) {
    return NextResponse.json(
      {
        ok: false,
        envCheck,
        error: "One or more required environment variables are missing.",
        hint: "Set ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, and ALIEXPRESS_TRACKING_ID in your Vercel project settings.",
      },
      { status: 503 },
    );
  }

  let configCheck: { appKeyLength: number; appSecretLength: number; trackingId: string; apiUrl: string } | null = null;
  try {
    const config = getAliExpressConfig();
    configCheck = {
      appKeyLength: config.appKey.length,
      appSecretLength: config.appSecret.length,
      trackingId: config.trackingId,
      apiUrl: config.apiUrl,
    };
  } catch {
    // already handled by envCheck above
  }

  let apiTest: { ok: boolean; productCount: number; error?: string } | null = null;
  try {
    const products = await getHotProducts({ page_size: 1 });
    apiTest = { ok: true, productCount: products.length };
  } catch (err) {
    const message = err instanceof AliExpressError
      ? `[${err.code}] ${err.message}`
      : err instanceof Error
        ? err.message
        : "Unknown error";
    apiTest = { ok: false, productCount: 0, error: message };
  }

  return NextResponse.json({
    ok: apiTest?.ok ?? false,
    envCheck,
    configCheck,
    apiTest,
    timestamp: new Date().toISOString(),
  });
}
