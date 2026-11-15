/* Cross-brand shopping categories ("shelves"). A product gets the FIRST shelf
   whose keywords appear in its title (Hebrew or English). Order matters. */
export type Shelf = { slug: string; label: string; blurb: string; keywords: string[] };

export const shelves: Shelf[] = [
  { slug: "robot-vacuums", label: "שואבים רובוטיים", blurb: "ניקיון חכם שעובד בשבילכם",
    keywords: ["robot", "רובוט", "deebot", "רובוטי"] },
  { slug: "vacuums", label: "שואבים ושוטפים", blurb: "אלחוטיים, ידניים ושוטפי רצפה",
    keywords: ["vacuum", "שואב", "floor one", "שוטף", "mop"] },
  { slug: "car", label: "לרכב", blurb: "מחזיקים, מטענים ומצלמות דרך",
    keywords: ["car ", "רכב", "dash cam", "dashcam"] },
  { slug: "charging", label: "מטענים וסוללות", blurb: "טעינה מהירה, GaN וסוללות ניידות",
    keywords: ["charger", "מטען", "power bank", "סוללה ניידת", "gan", "powerbank"] },
  { slug: "audio", label: "אוזניות ושמע", blurb: "ביטול רעשים, ספורט ורמקולים",
    keywords: ["earbuds", "אוזניות", "headphone", "speaker", "רמקול", "soundcore", "tws"] },
  { slug: "watches", label: "שעונים חכמים", blurb: "כושר, שינה והתראות על היד",
    keywords: ["watch", "שעון", "band", "צמיד"] },
  { slug: "cameras", label: "מצלמות", blurb: "360, אקסטרים ואבטחה לבית",
    keywords: ["camera", "מצלמה", "מצלמת", "insta360", "cam "] },
  { slug: "cables", label: "כבלים ומפצלים", blurb: "USB-C, מפצלים ומתאמים",
    keywords: ["cable", "כבל", "hub", "מפצל", "adapter", "מתאם"] },
  { slug: "computer", label: "מחשב ואביזרים", blurb: "עכברים, מקלדות ואביזרי עבודה",
    keywords: ["mouse", "עכבר", "keyboard", "מקלדת", "laptop", "לפטופ", "tablet", "טאבלט"] },
  { slug: "smart-home", label: "בית חכם", blurb: "מכשירים חכמים לכל פינה בבית",
    keywords: ["smart", "חכם", "kettle", "קומקום", "lamp", "מנורה"] },
];

export const OTHER = { slug: "more", label: "עוד מהמותגים" };

export function shelfFor(title: string) {
  const t = " " + title.toLowerCase() + " ";
  return shelves.find((s) => s.keywords.some((k) => t.includes(k)))?.slug ?? OTHER.slug;
}

export function shelfBySlug(slug: string) {
  return shelves.find((s) => s.slug === slug);
}
