// The single place for Israeli personal-import tax parameters.
// RULE: values are used ONLY when verified === true and official sources with a
// check date are present. Never fill these from memory.
export type TaxSource = { url: string; title: string; checkedAt: string; note?: string };
export type TaxConfig = {
  verified: boolean;
  checkedAt: string;
  /** Official sources the values were read from. */
  sources: TaxSource[];
  /** Personal imports valued up to this amount are exempt from VAT, purchase tax and customs. */
  exemptionUsd: number | null;
  vatRate: number | null;
  /** Up to this value customs duty is exempt; above it customs may apply (product-specific). */
  customsFreeUpToUsd: number | null;
  /** The exemption test uses the goods' value without shipping and insurance. */
  thresholdIncludesShipping: boolean | null;
  /** Above the exemption, VAT is charged on goods + shipping + insurance (+ purchase tax). */
  vatBaseIncludesShipping: boolean | null;
  /** Shipments from the same supplier arriving within this many hours are combined. */
  combineWindowHours: number | null;
  unverifiedReason: string;
};

export const IMPORT_TAX: TaxConfig = {
  verified: true,
  checkedAt: "2026-11-15",
  sources: [
    {
      url: "https://shaarolami-query.customs.mof.gov.il/CustomspilotWeb/PersonalImportTax/Home/Item?id=89",
      title: "רשות המסים בישראל: מחשבון מסי יבוא אישי",
      checkedAt: "2026-11-15",
      note: "בבדיקה ב־15.11.2026: \"מתחת ל־75$ פטור, מעל 75$ 18.00%\" (נבדקו כמה פריטים, למשל הלבשה כללי, מסגרות לתמונות ומיחם).",
    },
    {
      url: "https://fs.knesset.gov.il/globaldocs/MMM/51fb27d8-dddf-f011-a866-005056aa9911/2_51fb27d8-dddf-f011-a866-005056aa9911_11_21353.pdf",
      title: "מרכז המחקר והמידע של הכנסת: תיאור וניתוח העלאת תקרת הפטור ממיסים ביבוא אישי (28.12.2025)",
      checkedAt: "2026-11-15",
      note: "מבנה הכללים: מבחן הפטור לפי ערך החבילה ללא משלוח וביטוח; מעל הפטור המע\"מ מחושב כולל משלוח וביטוח; פטור ממכס עד 500$; משלוחים מאותו ספק בתוך 72 שעות מאוחדים. המסמך מתאר העלאה ל־150$ מדצמבר 2025; המחשבון הרשמי מציג כיום 75$.",
    },
  ],
  exemptionUsd: 75,
  vatRate: 0.18,
  customsFreeUpToUsd: 500,
  thresholdIncludesShipping: false,
  vatBaseIncludesShipping: true,
  combineWindowHours: 72,
  unverifiedReason: "",
};
