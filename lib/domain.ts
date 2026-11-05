export const STATUS = {
  new: "הפניה חדשה", contacted: "נוצר קשר", meeting: "נקבעה פגישה",
  signed: "נחתם הסכם", paid: "התקבל תשלום", lost: "לא הבשיל",
} as const;
export const PURPOSE = { purchase: "רכישת דירה", refinance: "מחזור משכנתה", investment: "נכס להשקעה", other: "ייעוץ אחר" } as const;
export type LeadStatus = keyof typeof STATUS;
export type Purpose = keyof typeof PURPOSE;
export type Partner = {
  id: string; name: string; email: string; phone: string; profession: string;
  code: string; status: "active" | "pending" | "paused"; createdAt: number;
};
export type Lead = {
  id: string; name: string; phone: string; purpose: Purpose; partnerId: string | null;
  status: LeadStatus; notes: string; feeReceived: number; commissionAmount: number | null;
  commissionStatus: "pending" | "approved" | "paid"; commissionRule?: string | null;
  commissionPaidAt?: number | null; consentAt: number; source: string; createdAt: number; updatedAt: number;
};
export type Settings = {
  businessName: string; advisorName: string; contactEmail: string; contactPhone: string;
  commissionMode: "unset" | "fixed" | "percentage"; commissionValue: number | null;
};
export type Activity = { id: string; leadId: string | null; partnerId: string | null; label: string; createdAt: number };
export type PortalData = {
  user: { name: string; email: string; role: "admin" | "partner"; partnerId: string | null };
  partners: Partner[]; leads: Lead[]; events: Activity[]; settings: Settings;
};
export const DEFAULT_SETTINGS: Settings = {
  businessName: "קשר", advisorName: "משרד ייעוץ המשכנתאות",
  contactEmail: "", contactPhone: "", commissionMode: "unset", commissionValue: null,
};
export function normalizePhone(input: string) {
  let phone = input.replace(/[\s()+.-]/g, "");
  if (phone.startsWith("972")) phone = "0" + phone.slice(3);
  return /^0(?:5\d{8}|[23489]\d{7})$/.test(phone) ? phone : null;
}
export function calculateCommission(mode: Settings["commissionMode"], value: number | null, fee: number) {
  if (mode === "unset" || value == null) return null;
  return mode === "fixed" ? Math.round(value) : Math.round(fee * value / 10000);
}
export function partnerLead(lead: Lead): Lead {
  return { ...lead, phone: "••• " + lead.phone.slice(-4), notes: "", feeReceived: 0, commissionRule: null };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export const money = (cents: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(cents / 100);
export const shortDate = (timestamp: number) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" }).format(timestamp);
