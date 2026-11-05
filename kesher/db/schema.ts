import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), ownerUserId: text("owner_user_id").notNull(),
  businessName: text("business_name").notNull(), advisorName: text("advisor_name").notNull(),
  contactEmail: text("contact_email").notNull(), contactPhone: text("contact_phone").notNull(),
  commissionMode: text("commission_mode").notNull().default("unset"),
  commissionValue: integer("commission_value"), updatedAt: integer("updated_at").notNull(),
});
export const partners = sqliteTable("partners", {
  id: text("id").primaryKey(), userId: text("user_id").unique(),
  name: text("name").notNull(), email: text("email").notNull().unique(),
  phone: text("phone").notNull(), profession: text("profession").notNull(),
  code: text("code").notNull().unique(), status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
});
export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(), name: text("name").notNull(), phone: text("phone").notNull().unique(),
  purpose: text("purpose").notNull(), partnerId: text("partner_id").references(() => partners.id),
  status: text("status").notNull().default("new"), notes: text("notes").notNull().default(""),
  feeReceived: integer("fee_received").notNull().default(0), commissionAmount: integer("commission_amount"),
  commissionStatus: text("commission_status").notNull().default("pending"),
  commissionRule: text("commission_rule"), commissionPaidAt: integer("commission_paid_at"),
  consentAt: integer("consent_at").notNull(), consentVersion: text("consent_version").notNull(),
  source: text("source").notNull(), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), leadId: text("lead_id").references(() => leads.id),
  partnerId: text("partner_id").references(() => partners.id), label: text("label").notNull(),
  internal: integer("internal").notNull().default(0), actorId: text("actor_id").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
});
