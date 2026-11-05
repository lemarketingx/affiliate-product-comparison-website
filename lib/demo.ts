import { DEFAULT_SETTINGS, STATUS } from "./domain";
import type { PortalData, Partner, Lead, LeadStatus, Purpose } from "./domain";
export function demoData(): PortalData {
  const now = Date.now(), day = 86400000;
  const names = ["רוני לוי", "מאיה כהן", "איתי ברק", "נועה ישראלי", "דניאל רז", "שני הדר", "עומר גולן"];
  const professions = ["תיווך נדל״ן", "ייעוץ פיננסי", "תיווך נדל״ן", "יצירת תוכן", "לקוחות וחברים", "ראיית חשבון", "תיווך נדל״ן"];
  const partners: Partner[] = names.map((name, i) => ({
    id: "demo-p" + i, name, email: "partner" + (i + 1) + "@example.com", phone: "050000100" + i,
    profession: professions[i], code: "demo0" + (i + 1),
    status: i === 5 ? "pending" : i === 6 ? "paused" : "active",
    createdAt: now - (80 - i * 5) * day,
  }));
  const clients = ["אור ושירה ישראלי", "יובל מזרחי", "עדי ורועי לוין", "תמר אבני", "משפחת הדר", "שחר כהן", "גיא ורוני פרץ", "ליהי ברק", "עמית דגן", "מיכל ושי רז", "אופיר לוי", "אורן לביא", "טליה רון", "דנה ואלון גבע", "ניב שקד", "רותם הדר", "נועה ויונתן גולן", "אדם סלע", "רוני בר", "איתי דרור", "מאיה ורן ארז", "שני אביב", "עומר ונופר אדר", "ליאור רז", "שיר אלמוג", "אורי דקל", "ענבר סלע", "דור ומאיה ברק", "הדר רום", "שירה אבני", "דן שלו", "נעמה בר", "רועי קדם", "ספיר רון", "נטע ונעם זיו", "אלעד כרמי"];
  const statuses: LeadStatus[] = ["new", "new", "contacted", "meeting", "signed", "paid", "contacted", "paid", "new", "meeting", "paid", "lost"];
  const purpose: Purpose[] = ["purchase", "refinance", "purchase", "investment", "purchase", "other"];
  const leads: Lead[] = clients.map((name, i) => ({
    id: "demo-l" + i, name, phone: "05000020" + String(i).padStart(2, "0"),
    purpose: purpose[i % purpose.length], partnerId: partners[i % 5].id,
    status: statuses[i % statuses.length], notes: "", feeReceived: statuses[i % statuses.length] === "paid" ? 800000 : 0,
    commissionAmount: null, commissionStatus: "pending", consentAt: now - i * day,
    source: "referral-link", createdAt: now - (i < 27 ? i * .85 : 35 + (i - 27) * 2) * day,
    updatedAt: now - i * 3600000,
  }));
  return {
    user: { name: "מנהל המערכת", email: "demo@example.com", role: "admin", partnerId: null },
    partners, leads, settings: { ...DEFAULT_SETTINGS },
    events: leads.slice(0, 10).map((lead, i) => ({
      id: "demo-e" + i, leadId: lead.id, partnerId: lead.partnerId,
      label: i === 0 ? "התקבלה הפניה חדשה: " + lead.name : lead.name + ": " + STATUS[lead.status],
      createdAt: now - i * 58 * 60000,
    })),
  };
}
