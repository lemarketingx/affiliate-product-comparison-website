/* Brands DealPilot sells. Owner-edited.
   storeMatch: lowercase fragments that must appear in the AliExpress shop name
   (together with "official") for a product to be shown at all.
   storeVerified: set to true ONLY after the owner manually confirmed the
   brand's official store on AliExpress. Until then the UI says the store was
   matched by name, never that it was verified.
   DealPilot is not affiliated with these brands; names are used to identify
   products only. Never add logos. */
export type Brand = {
  slug: string;
  name: string;
  he: string;
  term: string;
  storeMatch: string[];
  storeVerified: boolean;
  knownFor: string;
  shelves: string[];
};

export const brands: Brand[] = [
  { slug: "xiaomi", name: "Xiaomi", he: "שיאומי", term: "Xiaomi", storeMatch: ["xiaomi", "mi "], storeVerified: false,
    knownFor: "טלפונים, בית חכם, קורקינטים וגאדג׳טים לכל פינה.", shelves: ["בית חכם", "טלפונים", "גאדג׳טים"] },
  { slug: "anker", name: "Anker", he: "אנקר", term: "Anker", storeMatch: ["anker", "soundcore"], storeVerified: false,
    knownFor: "מטענים, סוללות ניידות ואוזניות Soundcore.", shelves: ["טעינה", "סוללות ניידות", "אודיו"] },
  { slug: "ugreen", name: "UGREEN", he: "יוגרין", term: "UGREEN", storeMatch: ["ugreen"], storeVerified: false,
    knownFor: "כבלים, מפצלים, מטענים ואביזרי מחשב.", shelves: ["כבלים", "מפצלים", "טעינה"] },
  { slug: "baseus", name: "Baseus", he: "באסאוס", term: "Baseus", storeMatch: ["baseus"], storeVerified: false,
    knownFor: "מטענים, אביזרי רכב ואביזרים לטלפון.", shelves: ["רכב", "טעינה", "טלפון"] },
  { slug: "lenovo", name: "Lenovo", he: "לנובו", term: "Lenovo", storeMatch: ["lenovo", "thinkplus"], storeVerified: false,
    knownFor: "אוזניות, אביזרי מחשב וטאבלטים.", shelves: ["אוזניות", "מחשב", "טאבלטים"] },
  { slug: "dreame", name: "Dreame", he: "דרימי", term: "Dreame", storeMatch: ["dreame"], storeVerified: false,
    knownFor: "שואבי אבק אלחוטיים ורובוטיים.", shelves: ["שואבים", "ניקיון"] },
  { slug: "roborock", name: "Roborock", he: "רובורוק", term: "Roborock", storeMatch: ["roborock"], storeVerified: false,
    knownFor: "שואבים רובוטיים ושוטפים.", shelves: ["שואבים רובוטיים"] },
  { slug: "ecovacs", name: "ECOVACS", he: "אקובקס", term: "ECOVACS", storeMatch: ["ecovacs"], storeVerified: false,
    knownFor: "רובוטי ניקיון מסדרת Deebot.", shelves: ["שואבים רובוטיים"] },
  { slug: "amazfit", name: "Amazfit", he: "אמאזפיט", term: "Amazfit", storeMatch: ["amazfit"], storeVerified: false,
    knownFor: "שעונים חכמים וצמידי כושר.", shelves: ["שעונים חכמים"] },
  { slug: "insta360", name: "Insta360", he: "אינסטה360", term: "Insta360", storeMatch: ["insta360"], storeVerified: false,
    knownFor: "מצלמות 360 ומצלמות אקסטרים.", shelves: ["מצלמות"] },
  { slug: "qcy", name: "QCY", he: "QCY", term: "QCY", storeMatch: ["qcy"], storeVerified: false,
    knownFor: "אוזניות אלחוטיות במחירים נגישים.", shelves: ["אוזניות"] },
  { slug: "tineco", name: "Tineco", he: "טינקו", term: "Tineco", storeMatch: ["tineco"], storeVerified: false,
    knownFor: "שואבים שוטפים לרצפה.", shelves: ["ניקיון"] },
];

export type StoreStatus = "verified" | "name-match" | "none";

export function storeStatus(brand: Brand, shopName: string | null): StoreStatus {
  if (!shopName) return "none";
  const s = " " + shopName.toLowerCase() + " ";
  const named = s.includes("official") && brand.storeMatch.some((m) => s.includes(m));
  if (!named) return "none";
  return brand.storeVerified ? "verified" : "name-match";
}

export function brandBySlug(slug: string) {
  return brands.find((b) => b.slug === slug);
}
