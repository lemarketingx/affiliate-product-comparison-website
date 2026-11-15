// The single place for Israeli personal-import tax parameters.
// RULE: values are used by the calculator ONLY when verified === true and an
// official source with a check date is present. Until then the calculator shows
// the tax component as "לא חושב" and explains why. Never fill these from memory.
export type TaxConfig = {
  verified: boolean;
  checkedAt: string;
  /** Official page where the values were read (gov.il / Israel Tax Authority). */
  officialSource: { url: string; title: string } | null;
  vatExemptionUsd: number | null;
  vatRate: number | null;
  /** Above this declared value customs/purchase tax may apply; product-specific, not computed. */
  customsThresholdUsd: number | null;
  /** Whether shipping counts toward the declared value. */
  shippingIncluded: boolean | null;
  unverifiedReason: string;
  /** Press reports found during research. Shown only with a "needs verification" label. */
  secondaryReports: { text: string; url: string; title: string; checkedAt: string }[];
};

export const IMPORT_TAX: TaxConfig = {
  verified: false,
  checkedAt: "2026-11-15",
  officialSource: null,
  vatExemptionUsd: null,
  vatRate: null,
  customsThresholdUsd: null,
  shippingIncluded: null,
  unverifiedReason:
    "לא הצלחנו לקרוא את העמוד הרשמי של רשות המסים ב־gov.il, ולכן לא אימתנו את תקרת הפטור ואת שיעור המע\"מ. ב־2026 התקרה השתנתה כמה פעמים, ולכן אנחנו לא מחשבים מס מהזיכרון.",
  secondaryReports: [
    {
      text: "כתבות מ־2026 מדווחות שתקרת הפטור ממע\"מ ביבוא אישי חזרה ל־75 דולר להזמנה, אחרי תקופה של העלאה זמנית. מעל התקרה המע\"מ חל על כל ערך החבילה כולל המשלוח.",
      url: "https://www.bizportal.co.il/additives/302/personal-import-tax-.html",
      title: "Bizportal (מקור משני)",
      checkedAt: "2026-11-15",
    },
    {
      text: "דיווח על ביטול ההעלאה והחזרת התקרה ל־75 דולר.",
      url: "https://www.mako.co.il/finances-consumer/Article-e5b962bc9e28e91026.htm",
      title: "mako (מקור משני)",
      checkedAt: "2026-11-15",
    },
  ],
};
