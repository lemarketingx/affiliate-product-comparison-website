import type { Trait } from "./types.ts";
import { SOURCES } from "./sources.ts";

// Reusable building blocks. A product type lists the traits that apply to it,
// and the plan is composed from them. Wording is careful on purpose:
// "usually", "check the seller" — never a promise about a specific listing.

const mains: Trait = {
  id: "mains",
  label: "מחובר לחשמל הביתי",
  manifest: [
    {
      id: "plug-adapter",
      label: "תקע ישראלי או מתאם",
      status: "recommended",
      why: "מוכרים רבים שולחים תקע אירופי (EU), אמריקאי (US) או בריטי (UK). תקע EU עגול בדרך כלל נכנס לשקע ישראלי חדש, אבל לא לכל שקע ישן.",
      search: "Israel plug adapter type H",
      terms: ["plug-h"],
    },
  ],
  israel: [
    {
      text: "בישראל מתח הרשת הוא 230V בתדר 50Hz, והשקעים הם מסוג H, ובחלק מהמקומות גם C.",
      source: SOURCES.plugs,
    },
    {
      text: "בחרו גרסה שכתוב בה 220–240V או 100–240V. מוצר שמיועד רק ל־110V עלול להישרף בלי שנאי.",
      general: true,
    },
    {
      text: "ייתכן שמוצרי חשמל מסוימים דורשים התאמה לתקן ישראלי. בדקו אם זה חל על יבוא אישי של המוצר שלכם.",
      needsVerification: true,
    },
  ],
  pageChecks: [
    "בחרו בתפריט האפשרויות את סוג התקע (Plug type): IL אם יש, אחרת EU.",
    "חפשו בתמונות או במפרט את טווח המתח: 220V, 230V או 100–240V.",
  ],
  buyLocal: [
    {
      text: "מוצר חשמלי שעובד צמוד לגוף, למים או לחום גבוה (מייבש שיער, מפזר חום, מכשיר מטבח חזק): אצל יבואן מקומי יש אחריות וכתובת לפנות אליה.",
      general: true,
    },
  ],
};

const usbPower: Trait = {
  id: "usb-power",
  label: "נטען או עובד ב־USB",
  manifest: [
    {
      id: "usb-adapter",
      label: "מטען קיר USB עם תקע ישראלי",
      status: "recommended",
      why: "הרבה מוצרים מגיעים רק עם כבל, בלי ראש מטען. אם יש לכם מטען טלפון רגיל, בדרך כלל הוא יספיק.",
      search: "USB C charger 20W",
      terms: ["pd"],
    },
    {
      id: "usb-cable",
      label: "כבל טעינה מתאים (USB-C / Micro-USB)",
      status: "in_box",
      why: "בדרך כלל כלול. בדקו את סוג החיבור, כדי שתוכלו להשתמש בכבל שכבר יש לכם.",
      terms: ["usb-c"],
    },
  ],
  israel: [],
  pageChecks: ["בדקו בתמונות מה כלול באריזה (Package includes): כבל בלבד, או גם ראש מטען?"],
  buyLocal: [],
  questions: [
    {
      id: "has-charger",
      text: "יש לכם בבית מטען USB רגיל (כמו של הטלפון)?",
      options: [
        { id: "yes", label: "כן, יש", effect: { have: ["usb-adapter"] } },
        { id: "no", label: "לא / לא בטוחים", effect: { require: ["usb-adapter"] } },
      ],
    },
  ],
};

const lithium: Trait = {
  id: "lithium",
  label: "סוללת ליתיום",
  manifest: [],
  israel: [
    {
      text: "חלק משיטות המשלוח לא מובילות סוללות ליתיום, או מובילות אותן רק בתוך המכשיר. לכן מוכר עשוי להציע לישראל רק שיטת משלוח מסוימת, יקרה יותר.",
      needsVerification: true,
    },
  ],
  pageChecks: [
    "בדקו שקיבולת הסוללה (mAh או Wh) כתובה במפרט ולא רק בכותרת.",
    "בעמוד התשלום: בדקו שיש שיטת משלוח זמינה לישראל ומה המחיר שלה.",
  ],
  buyLocal: [
    {
      text: "סוללה זולה ממוכר לא מוכר היא סיכון. במוצרים שנטענים ליד מיטה או ילדים, כדאי לשקול מותג עם אחריות מקומית.",
      general: true,
    },
  ],
};

const wifi: Trait = {
  id: "wifi",
  label: "WiFi",
  manifest: [
    {
      id: "wifi-extender",
      label: "מגדיל טווח WiFi",
      status: "optional",
      why: "רק אם הקליטה במקום ההתקנה חלשה.",
      search: "WiFi repeater 2.4GHz",
      terms: ["24ghz"],
    },
  ],
  israel: [
    {
      text: "מוצרי בית חכם ומצלמות רבים עובדים רק ב־WiFi של 2.4GHz ולא ב־5GHz. ודאו שהראוטר שלכם משדר גם 2.4GHz.",
      general: true,
    },
    {
      text: "מכשירים אלחוטיים כפופים להסדרה של משרד התקשורת. כללי הפטור ליבוא אישי משתנים, ובדקו אותם לפני הזמנה.",
      needsVerification: true,
    },
  ],
  pageChecks: ["חפשו במפרט 2.4GHz או Dual-band, ובדקו שהמכשיר תומך בתקן ה־WiFi של הראוטר."],
  buyLocal: [],
  questions: [
    {
      id: "wifi-signal",
      text: "יש קליטת WiFi טובה במקום שבו המכשיר יעמוד?",
      hint: "בדקו עם הטלפון: אם הסרטון בטלפון נתקע שם, גם המכשיר יתקשה.",
      terms: ["24ghz"],
      options: [
        { id: "yes", label: "כן, קליטה טובה" },
        {
          id: "weak",
          label: "חלשה / לא בטוחים",
          effect: { require: ["wifi-extender"], note: "קליטה חלשה היא הסיבה הנפוצה ביותר לניתוקים. שקלו מגדיל טווח או נקודת רשת קרובה." },
        },
      ],
    },
  ],
};

const cellular: Trait = {
  id: "cellular",
  label: "סלולר / סים",
  manifest: [
    {
      id: "sim",
      label: "כרטיס סים ישראלי עם חבילת גלישה",
      status: "required",
      why: "מכשיר 4G צריך סים משלו ותשלום חודשי. הסים לא נמכר עם המכשיר.",
      terms: ["4g", "lte-bands"],
    },
  ],
  israel: [
    {
      text: "לא כל מכשיר 4G תומך בתדרי ה־LTE שבשימוש בישראל. השוו את רשימת התדרים (Bands) במפרט לתדרים של הספק הסלולרי שלכם.",
      needsVerification: true,
    },
    {
      text: "מכשירים רבים מסוג זה נמכרים בגרסאות לפי אזור (למשל EU או Global). הגרסה שתבחרו קובעת את התדרים.",
      general: true,
    },
  ],
  pageChecks: [
    "בחרו את הגרסה (Version / Region) והעתיקו את רשימת ה־LTE Bands. בדקו אותה מול הספק הסלולרי לפני תשלום.",
    "בדקו אם המכשיר תומך ב־Nano SIM או Micro SIM.",
  ],
  buyLocal: [],
};

const storage: Trait = {
  id: "storage",
  label: "מקליט / שומר קבצים",
  manifest: [],
  israel: [],
  pageChecks: [
    "בדקו את הנפח המקסימלי שהמכשיר תומך בו (Max supported), למשל 128GB או 8TB.",
    "חפשו במפורש אם כרטיס הזיכרון או הדיסק כלול. לעיתים מוצג בתמונה אבל נמכר כאפשרות נפרדת.",
  ],
  buyLocal: [],
  calculator: "storage",
};

const app: Trait = {
  id: "app",
  label: "עובד עם אפליקציה",
  manifest: [],
  israel: [
    {
      text: "חפשו את שם האפליקציה בחנות האפליקציות בטלפון לפני ההזמנה. אם היא לא מופיעה בישראל, המכשיר עלול לא לעבוד.",
      general: true,
    },
  ],
  pageChecks: ["העתיקו את שם האפליקציה מהמפרט (APP) וחפשו אותה בחנות לפני הזמנה."],
  buyLocal: [
    {
      text: "אם המכשיר תלוי בענן של יצרן לא מוכר, הוא עלול להפסיק לעבוד אם השירות ייסגר.",
      general: true,
    },
  ],
};

const sizing: Trait = {
  id: "sizing",
  label: "מידות",
  manifest: [],
  israel: [
    {
      text: "המידות באסיה בדרך כלל קטנות מהמידות המוכרות בישראל. מודדים ומשווים לטבלת המידות של המוכר, לא לפי המידה הרגילה שלכם.",
      general: true,
    },
  ],
  pageChecks: [
    "פתחו את טבלת המידות (Size chart) ומדדו בגד או נעל שכבר מתאימים לכם, בסנטימטרים.",
    "קראו ביקורות שמציינות \"small\" או \"large\".",
  ],
  buyLocal: [
    {
      text: "החזרה לחו\"ל בגלל מידה לא נכונה כרוכה בעלות משלוח, ולפעמים לא משתלמת. כשאתם לא בטוחים במידה, כדאי לשקול חנות שמאפשרת החלפה.",
      general: true,
    },
  ],
};

const safety: Trait = {
  id: "safety",
  label: "מוצר בטיחות",
  manifest: [],
  israel: [
    {
      text: "חלק ממוצרי הבטיחות (כמו כיסא בטיחות לרכב או קסדה) חייבים לעמוד בתקן מוכר. בדקו את הדרישה העדכנית לפני רכישה מחו\"ל.",
      needsVerification: true,
    },
  ],
  pageChecks: ["חפשו מספר תקן ותעודה אמיתית (לא רק \"certified\" בכותרת)."],
  buyLocal: [
    {
      text: "במוצר שתפקידו להגן על חיים, תעודה מזויפת היא סיכון אמיתי שאי אפשר לבדוק מהתמונות. כאן ההמלצה שלנו: קנו בישראל, בחנות שמציגה תקן.",
      general: true,
    },
  ],
};

const kids: Trait = {
  id: "kids",
  label: "לילדים",
  manifest: [
    {
      id: "aa-batteries",
      label: "סוללות (AA / AAA / כפתור)",
      status: "required",
      why: "צעצועים רבים מגיעים בלי סוללות, כי אסור או יקר לשלוח אותן.",
      terms: [],
    },
  ],
  israel: [
    {
      text: "על צעצועים חלים תקני בטיחות, ובהם התייחסות לחלקים קטנים ולסוללות כפתור. בדקו את הגיל המומלץ ואת התקן.",
      needsVerification: true,
    },
  ],
  pageChecks: [
    "בדקו את הגיל המומלץ (Age range) ואם יש חלקים קטנים.",
    "סוללת כפתור: ודאו שתא הסוללה נסגר בבורג.",
  ],
  buyLocal: [
    {
      text: "לפעוטות מתחת לגיל 3, ולכל צעצוע עם סוללת כפתור או מגנטים קטנים, עדיף יבואן מקומי שאחראי לתקן.",
      general: true,
    },
  ],
};

const bulky: Trait = {
  id: "bulky",
  label: "גדול או כבד",
  manifest: [],
  israel: [
    {
      text: "במוצר גדול המשלוח יכול לעלות כמו המוצר עצמו. בנוסף, מעל תקרת הפטור ייתכן תשלום מס על המחיר כולל המשלוח.",
      needsVerification: true,
    },
  ],
  pageChecks: ["בדקו את עלות המשלוח לישראל בעמוד התשלום, לא בכותרת."],
  buyLocal: [
    {
      text: "במוצרים גדולים הפער מצטמצם בגלל המשלוח. ואם יש תקלה, החזרה כמעט לא אפשרית.",
      general: true,
    },
  ],
};

const car12v: Trait = {
  id: "car12v",
  label: "חשמל רכב",
  manifest: [
    {
      id: "car-usb",
      label: "מתאם USB לשקע המצית",
      status: "recommended",
      why: "חלק מהמכשירים מגיעים רק עם כבל USB. אם אין ברכב שקע USB חזק מספיק, צריך מתאם.",
      search: "car charger USB C dual port",
    },
  ],
  israel: [],
  pageChecks: ["בדקו את מתח העבודה (12V / 24V) ואת סוג החיבור לרכב."],
  buyLocal: [
    {
      text: "חיבור קבוע לחשמל הרכב, למשל לקופסת הנתיכים, כדאי לבצע אצל חשמלאי רכב. אחריות היצרן על הרכב עשויה להיות מושפעת.",
      general: true,
    },
  ],
};

const compat: Trait = {
  id: "compat",
  label: "תאימות לדגם",
  manifest: [],
  israel: [],
  pageChecks: [
    "בחרו את הדגם המדויק ברשימת האפשרויות. אל תסתמכו על \"מתאים לכל הדגמים\".",
    "בדקו בהגדרות הטלפון את שם הדגם המדויק לפני ההזמנה.",
  ],
  buyLocal: [],
};

export const TRAITS: Record<string, Trait> = Object.fromEntries(
  [mains, usbPower, lithium, wifi, cellular, storage, app, sizing, safety, kids, bulky, car12v, compat].map(
    (t) => [t.id, t],
  ),
);
