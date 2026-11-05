import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { settings, partners, leads, events } from "../db/schema";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { DEFAULT_SETTINGS, calculateCommission, partnerLead, normalizePhone, STATUS } from "./domain";
import type { Lead, PortalData, Settings } from "./domain";
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const id = () => crypto.randomUUID();
export async function context(initialize = false) {
  const user = await getChatGPTUser();
  if (!user) throw new ApiError(401, "יש להתחבר כדי להיכנס למערכת.");
  const db = getDb();
  if (initialize) {
    // First setup is protected by the owner-private Sites access gate.
    await db.insert(settings).values({
      id: 1, ownerUserId: user.userId, ...DEFAULT_SETTINGS, updatedAt: Date.now(),
    }).onConflictDoNothing();
  }
  const config = await db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!config) throw new ApiError(503, "מנהל המערכת צריך להפעיל את החשבון תחילה.");
  const isAdmin = config.ownerUserId === user.userId;
  const partner = isAdmin ? undefined : await db.select().from(partners).where(eq(partners.userId, user.userId)).get();
  return { db, user, config, isAdmin, partner };
}
function admin(ctx: Awaited<ReturnType<typeof context>>) {
  if (!ctx.isAdmin) throw new ApiError(403, "הפעולה זמינה למנהל בלבד.");
}
const partnerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).transform(v => v.toLowerCase()),
  phone: z.string().transform(normalizePhone).refine(v => v !== null, "מספר הטלפון אינו תקין"),
  profession: z.string().trim().min(2).max(60),
});
export const intakeSchema = z.object({
  name: z.string().trim().min(2, "יש למלא שם מלא").max(80),
  phone: z.string().transform(normalizePhone).refine(v => v !== null, "יש למלא מספר טלפון ישראלי תקין"),
  purpose: z.enum(["purchase", "refinance", "investment", "other"]),
  consent: z.literal(true, { errorMap: () => ({ message: "יש לאשר את מסירת הפרטים" }) }),
});
export async function readPortal(): Promise<PortalData> {
  const ctx = await context(true);
  if (!ctx.isAdmin && !ctx.partner) throw new ApiError(428, "יש להשלים הרשמה כשותף.");
  if (!ctx.isAdmin && ctx.partner?.status === "paused") throw new ApiError(403, "החשבון מושהה. יש לפנות למנהל.");
  const [partnerRows, leadRows, eventRows] = await Promise.all([
    ctx.isAdmin ? ctx.db.select().from(partners).orderBy(desc(partners.createdAt)).all() : Promise.resolve([ctx.partner!]),
    ctx.isAdmin ? ctx.db.select().from(leads).orderBy(desc(leads.createdAt)).all()
      : ctx.db.select().from(leads).where(eq(leads.partnerId, ctx.partner!.id)).orderBy(desc(leads.createdAt)).all(),
    ctx.isAdmin ? ctx.db.select().from(events).orderBy(desc(events.createdAt)).limit(80).all()
      : ctx.db.select().from(events).where(eq(events.partnerId, ctx.partner!.id)).orderBy(desc(events.createdAt)).limit(80).all(),
  ]);
  const { ownerUserId, id: _, updatedAt, ...publicSettings } = ctx.config;
  return {
    user: { name: ctx.user.fullName ?? (ctx.isAdmin ? "מנהל המערכת" : ctx.partner!.name), email: ctx.user.email, role: ctx.isAdmin ? "admin" : "partner", partnerId: ctx.partner?.id ?? null },
    partners: partnerRows as PortalData["partners"],
    leads: ctx.isAdmin ? leadRows as Lead[] : (leadRows as Lead[]).map(partnerLead),
    events: eventRows.filter(e => ctx.isAdmin || !e.internal),
    settings: publicSettings as Settings,
  };
}
export async function insertLead(input: unknown, partnerId: string | null, actorId: string, source: string) {
  const data = intakeSchema.parse(input);
  const db = getDb();
  if (partnerId) {
    const partner = await db.select().from(partners).where(eq(partners.id, partnerId)).get();
    if (!partner || partner.status !== "active") throw new ApiError(400, "השותף אינו פעיל כרגע.");
  }
  const duplicate = await db.select({ id: leads.id }).from(leads).where(eq(leads.phone, data.phone!)).get();
  if (duplicate) throw new ApiError(409, "הפנייה לא נקלטה כי המספר כבר רשום במערכת. אפשר לפנות למשרד לבירור השיוך.");
  const leadId = id(), now = Date.now();
  try {
    await db.batch([
      db.insert(leads).values({
        id: leadId, name: data.name, phone: data.phone!, purpose: data.purpose, partnerId,
        status: "new", source, consentAt: now, consentVersion: "referral-v1",
        createdAt: now, updatedAt: now,
      }),
      db.insert(events).values({ id: id(), leadId, partnerId, label: "התקבלה הפניה חדשה: " + data.name, actorId, createdAt: now }),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new ApiError(409, "המספר כבר רשום במערכת.");
    throw error;
  }
  return leadId;
}
export async function mutatePortal(action: string, payload: Record<string, unknown>) {
  const ctx = await context();
  const { db } = ctx;
  const now = Date.now();
  if (action === "register") {
    const data = partnerSchema.parse({ ...payload, email: ctx.user.email });
    if (payload.consent !== true) throw new ApiError(400, "יש לאשר את תנאי ההרשמה.");
    if (ctx.isAdmin) throw new ApiError(400, "למנהל כבר יש גישה למערכת.");
    if (ctx.partner) return;
    const existing = await db.select().from(partners).where(eq(partners.email, data.email)).get();
    if (existing) {
      if (existing.userId && existing.userId !== ctx.user.userId) throw new ApiError(409, "החשבון כבר משויך.");
      await db.update(partners).set({ userId: ctx.user.userId, name: data.name, phone: data.phone!, profession: data.profession }).where(eq(partners.id, existing.id));
    } else {
      const partnerId = id();
      await db.batch([
        db.insert(partners).values({ id: partnerId, userId: ctx.user.userId, ...data, phone: data.phone!, code: id().replaceAll("-", "").slice(0, 10), status: "pending", createdAt: now }),
        db.insert(events).values({ id: id(), partnerId, label: data.name + " ביקש להצטרף לתוכנית", actorId: ctx.user.userId, createdAt: now }),
      ]);
    }
    return;
  }
  if (action === "addLead") {
    if (!ctx.isAdmin && ctx.partner?.status !== "active") throw new ApiError(403, "החשבון ממתין לאישור מנהל.");
    return insertLead(payload, ctx.isAdmin ? z.string().nullable().parse(payload.partnerId ?? null) : ctx.partner!.id, ctx.user.userId, "portal");
  }
  admin(ctx);
  if (action === "addPartner") {
    const data = partnerSchema.parse(payload);
    const duplicate = await db.select({ id: partners.id }).from(partners).where(eq(partners.email, data.email)).get();
    if (duplicate) throw new ApiError(409, "כתובת הדוא״ל כבר רשומה כשותף.");
    const partnerId = id();
    await db.batch([
      db.insert(partners).values({ id: partnerId, ...data, phone: data.phone!, code: id().replaceAll("-", "").slice(0, 10), status: "active", createdAt: now }),
      db.insert(events).values({ id: id(), partnerId, label: "נוסף שותף חדש: " + data.name, actorId: ctx.user.userId, createdAt: now }),
    ]);
    return;
  }
  if (action === "partnerStatus") {
    const data = z.object({ id: z.string(), status: z.enum(["active", "pending", "paused"]) }).parse(payload);
    const partner = await db.select().from(partners).where(eq(partners.id, data.id)).get();
    if (!partner) throw new ApiError(404, "השותף לא נמצא.");
    await db.batch([
      db.update(partners).set({ status: data.status }).where(eq(partners.id, data.id)),
      db.insert(events).values({ id: id(), partnerId: data.id, label: "סטטוס השותף " + partner.name + " עודכן", actorId: ctx.user.userId, createdAt: now }),
    ]);
    return;
  }
  if (action === "saveSettings") {
    const data = z.object({
      businessName: z.string().trim().min(2).max(60), advisorName: z.string().trim().min(2).max(80),
      contactEmail: z.union([z.literal(""), z.string().email().max(160)]),
      contactPhone: z.union([z.literal(""), z.string().refine(v => !!normalizePhone(v))]),
      commissionMode: z.enum(["unset", "fixed", "percentage"]), commissionValue: z.number().int().min(0).max(10000000).nullable(),
    }).parse(payload);
    if (data.commissionMode !== "unset" && data.commissionValue == null) throw new ApiError(400, "יש להזין את גובה העמלה.");
    if (data.commissionMode === "percentage" && data.commissionValue! > 10000) throw new ApiError(400, "האחוז צריך להיות בין 0 ל־100.");
    await db.update(settings).set({ ...data, commissionValue: data.commissionMode === "unset" ? null : data.commissionValue, updatedAt: now }).where(eq(settings.id, 1));
    return;
  }
  const leadId = z.string().parse(payload.id);
  const lead = await db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) throw new ApiError(404, "ההפניה לא נמצאה.");
  if (action === "updateLead") {
    const data = z.object({
      status: z.enum(["new", "contacted", "meeting", "signed", "paid", "lost"]),
      notes: z.string().max(4000), feeReceived: z.number().int().min(0).max(100000000),
    }).parse(payload);
    if (data.status === "paid" && data.feeReceived <= 0) throw new ApiError(400, "יש להזין את שכר הטרחה שהתקבל.");
    if ((lead.commissionStatus === "approved" || lead.commissionStatus === "paid") && data.status !== "paid") throw new ApiError(400, "יש להסדיר תחילה עמלה שאושרה או שולמה.");
    if (lead.status === "paid" && data.feeReceived !== lead.feeReceived) throw new ApiError(400, "שכר הטרחה ננעל לאחר רישום הגבייה.");
    const newPayment = data.status === "paid" && lead.status !== "paid";
    const commissionAmount = newPayment && lead.partnerId
      ? calculateCommission(ctx.config.commissionMode as Settings["commissionMode"], ctx.config.commissionValue, data.feeReceived)
      : lead.commissionAmount;
    await db.batch([
      db.update(leads).set({ ...data, commissionAmount, commissionRule: newPayment ? JSON.stringify({ mode: ctx.config.commissionMode, value: ctx.config.commissionValue }) : lead.commissionRule, updatedAt: now }).where(eq(leads.id, leadId)),
      db.insert(events).values({ id: id(), leadId, partnerId: lead.partnerId, label: lead.name + ": " + STATUS[data.status], internal: data.status === lead.status ? 1 : 0, actorId: ctx.user.userId, createdAt: now }),
    ]);
    return;
  }
  if (action === "commission") {
    const data = z.object({ amount: z.number().int().min(0).max(10000000), status: z.enum(["pending", "approved", "paid"]) }).parse(payload);
    if (!lead.partnerId || lead.status !== "paid") throw new ApiError(400, "ניתן לטפל בעמלה רק להפניה של שותף שהתקבל עבורה תשלום.");
    if (lead.commissionStatus === "paid") throw new ApiError(400, "העמלה כבר סומנה כשולמה.");
    if (data.status === "paid" && (lead.commissionStatus !== "approved" || data.amount !== lead.commissionAmount)) throw new ApiError(400, "יש לאשר את הסכום לפני סימון התשלום.");
    await db.batch([
      db.update(leads).set({ commissionAmount: data.amount, commissionStatus: data.status, commissionPaidAt: data.status === "paid" ? now : null, updatedAt: now }).where(eq(leads.id, leadId)),
      db.insert(events).values({ id: id(), leadId, partnerId: lead.partnerId, label: lead.name + ": " + (data.status === "paid" ? "עמלת השותף סומנה כשולמה" : data.status === "approved" ? "אושרה עמלת השותף" : "עודכנה עמלת השותף"), actorId: ctx.user.userId, createdAt: now }),
    ]);
    return;
  }
  throw new ApiError(400, "הפעולה אינה מוכרת.");
}
export function apiFailure(error: unknown) {
  if (error instanceof SyntaxError) return Response.json({ error: "הבקשה אינה תקינה." }, { status: 400 });
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "יש לבדוק את הפרטים שהוזנו." }, { status: 400 });
  console.error("Portal operation failed", error instanceof Error ? error.message : "unknown error");
  return Response.json({ error: "לא הצלחנו להשלים את הפעולה. נסו שוב בעוד רגע." }, { status: 500 });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "הבקשה לא אושרה.");
}
