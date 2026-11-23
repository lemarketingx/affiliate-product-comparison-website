/**
 * A conservative Hebrew display title for supplier-written AliExpress listings.
 * This only changes presentation. Keep raw titles for search, matching, imports
 * and audit trails. Extract features ONLY when explicitly present in the title;
 * do not invent compatibility, product models, certification or authenticity.
 */
import { cleanListingTitle } from "./listing-rules.ts";

const TYPES: { label: string; match: RegExp }[] = [
  { label: "מתנע נייד לרכב", match: /(?:\bjump[\s-]*starter\b|מתנע|בוסטר התנעה)/i },
  { label: "מארגן כבלים", match: /(?:מנהל כבלים|מארגן כבלים|מארגן חוטים|מנהל כבל|wire winder|cable organizer|cable holder)/i },
  { label: "מגן מסך", match: /(?:מגן מסך|screen protector|tempered glass)/i },
  { label: "מצלמת דרך", match: /(?:מצלמת דרך|מצלמת רכב|dash[\s-]*cam)/i },
  { label: "מארז לכונן SSD", match: /(?:מארז\s*SSD|SSD\s*enclosure)/i },
  { label: "סוללה ניידת", match: /(?:סוללה ניידת|מטען נייד|power[\s-]*bank|בנק כוח)/i },
  { label: "כבל", match: /(?:כבל|cable|כבלי טעינה)/i },
  { label: "מטען לרכב", match: /(?:מטען לרכב|מטען רכב|car[\s-]*charger)/i },
  { label: "מטען", match: /(?:מטען|charger|טעינה מהירה)/i },
  { label: "אוזניות", match: /(?:אוזניות|earphones?|earbuds?|headphones?|headset)/i },
  { label: "רכזת USB", match: /(?:רכזת|USB[\s-]*hub|docking station|תחנת עגינה)/i },
  { label: "עכבר", match: /(?:עכבר|\bmouse\b)/i },
  { label: "משאבת אוויר", match: /(?:משאבת אוויר|air[\s-]*inflator)/i },
  { label: "מעמד", match: /(?:מעמד|stand|holder)/i },
  { label: "כיסוי", match: /(?:כיסוי|phone case|protective case)/i },
];

function safeShortTitle(raw: string): string {
  const cleaned = raw.replace(/[【】]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 92) return cleaned;
  const part = cleaned.slice(0, 92);
  return (part.slice(0, part.lastIndexOf(" ")) || part).trim();
}

export function productDisplayTitle(rawTitle: string, brandName: string | null = null): string {
  const original = cleanListingTitle(rawTitle || "").trim();
  if (!original) return "מוצר בקטלוג";
  const brand = brandName?.trim() ?? "";
  const type = TYPES.find((entry) => entry.match.test(original));
  // Without a recognized brand and type, do not invent an identification.
  if (!brand || !type) return safeShortTitle(original);

  const category = type.label;
  const nameParts: string[] = [category, brand];

  // Keep only distinctive, clearly stated model names.
  const model = original.match(/\b(?:Nexode(?:\s+Air)?|UNO|Encok\s+[A-Z0-9/-]{2,12}|Bass\s+EP\d+[A-Z]*|Studio\s+Pro|Liberty\s+\d+\s*(?:NC|Pro)?)\b/i)?.[0];
  if (model && !nameParts.some((p) => p.toLowerCase() === model.toLowerCase())) nameParts.push(model);

  const addSpecs = ["כבל", "מטען", "מטען לרכב", "סוללה ניידת", "רכזת USB", "מארז לכונן SSD", "אוזניות", "עכבר"].includes(category);
  if (addSpecs) {
    if (/(?:\bUSB[\s-]*C\b|\bType[\s-]*C\b|סוג\s*C\b)/i.test(original) && category !== "רכזת USB") nameParts.push("USB-C");
    const wattages = [...original.matchAll(/(?:^|[^\d])(\d{1,3})\s*W\b/gi)].map((m) => Number(m[1]));
    const uniqueWattages = [...new Set(wattages)].filter((w) => w > 0 && w <= 300);
    if (uniqueWattages.length === 1 && ["כבל", "מטען", "מטען לרכב", "סוללה ניידת"].includes(category)) nameParts.push(uniqueWattages[0] + "W");
    const capacity = original.match(/\b(\d{4,6})\s*mAh\b/i);
    if (category === "סוללה ניידת" && capacity) nameParts.push(Number(capacity[1]).toLocaleString("en-US") + "mAh");
    if (category === "אוזניות" && /\bANC\b/i.test(original)) nameParts.push("ANC");
  }

  // Do not turn source marketing claims into independently verified recommendations.
  return nameParts.join(" ");
}
