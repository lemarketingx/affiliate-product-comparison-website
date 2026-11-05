import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { partners } from "../../../db/schema";
import { insertLead, apiFailure, ApiError, sameOrigin } from "../../../lib/portal-server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6000) throw new ApiError(413, "הבקשה גדולה מדי.");
    const input = await request.json() as Record<string, unknown>;
    if (input.website) return Response.json({ ok: true });
    if (typeof input.code !== "string" || !/^[a-z0-9]{6,16}$/.test(input.code)) throw new ApiError(400, "קישור ההפניה אינו תקין.");
    const partner = await getDb().select().from(partners).where(eq(partners.code, input.code)).get();
    if (!partner || partner.status !== "active") throw new ApiError(404, "קישור ההפניה אינו פעיל.");
    const hour = Math.floor(Date.now() / 3600000);
    const keyData = new TextEncoder().encode((request.headers.get("cf-connecting-ip") || "unknown") + ":" + hour);
    const key = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", keyData))).map(x => x.toString(16).padStart(2, "0")).join("");
    const result = await env.DB!.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 10 RETURNING count").bind(key, (hour + 1) * 3600000).first();
    if (!result) throw new ApiError(429, "התקבלו פניות רבות. נסו שוב מאוחר יותר.");
    await env.DB!.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(Date.now()).run();
    await insertLead(input, partner.id, "visitor", "referral-link");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
