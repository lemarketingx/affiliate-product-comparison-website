/**
 * DealPilot's curated brand discovery registry. Presence on this list is NOT
 * proof that a seller or an individual item is authentic, official, or licensed.
 * Exact Latin tokens avoid "anker" inside "banker" and spoofed suffixes.
 */
export const BRANDS = [
  { slug: "xiaomi", name: "Xiaomi", aliases: ["xiaomi", "שיאומי"], category: "tech" },
  { slug: "redmi", name: "Redmi", aliases: ["redmi", "רדמי"], category: "tech" },
  { slug: "poco", name: "POCO", aliases: ["poco", "פוקו"], category: "tech" },
  { slug: "baseus", name: "Baseus", aliases: ["baseus", "בייסוס"], category: "tech" },
  { slug: "ugreen", name: "UGREEN", aliases: ["ugreen", "יוגרין"], category: "tech" },
  { slug: "anker", name: "Anker", aliases: ["anker", "אנקר"], category: "tech" },
  { slug: "soundcore", name: "Soundcore", aliases: ["soundcore", "סאונדקור"], category: "tech" },
  { slug: "qcy", name: "QCY", aliases: ["qcy"], category: "tech" },
  { slug: "edifier", name: "Edifier", aliases: ["edifier"], category: "tech" },
  { slug: "70mai", name: "70mai", aliases: ["70mai"], category: "car" },
  { slug: "viofo", name: "VIOFO", aliases: ["viofo"], category: "car" },
  { slug: "ddpai", name: "DDPAI", aliases: ["ddpai"], category: "car" },
  { slug: "dreame", name: "Dreame", aliases: ["dreame", "דרימי"], category: "home" },
  { slug: "roborock", name: "Roborock", aliases: ["roborock", "רובורוק"], category: "home" },
  { slug: "yeelight", name: "Yeelight", aliases: ["yeelight"], category: "home" },
  { slug: "reolink", name: "Reolink", aliases: ["reolink"], category: "home" },
  { slug: "amazfit", name: "Amazfit", aliases: ["amazfit", "אמזפיט"], category: "sport" },
  { slug: "naturehike", name: "Naturehike", aliases: ["naturehike"], category: "sport" },
  { slug: "rockbros", name: "ROCKBROS", aliases: ["rockbros"], category: "sport" },
  { slug: "ulanzi", name: "Ulanzi", aliases: ["ulanzi"], category: "tech" },
  { slug: "creality", name: "Creality", aliases: ["creality"], category: "tech" },
  { slug: "anycubic", name: "Anycubic", aliases: ["anycubic"], category: "tech" },
] as const;
export type KnownBrand = (typeof BRANDS)[number];
const tokens = (s: string) => s.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/);
export function identifyListedBrand(input: { title: string; shopName?: string | null; supplierBrand?: string | null }): KnownBrand | null {
  // Product titles are controlled by sellers and are not sufficient proof.
  // A trustworthy identification requires a separate brand field, or corroboration
  // from the store name. Still do not claim official-store or authenticity status.
  const title = tokens(input.title);
  const shop = tokens(input.shopName ?? "");
  const supplied = tokens(input.supplierBrand ?? "");
  // A store named after several brands, or a parts/accessories store, is a
  // reseller of compatible items: its name does not corroborate any brand.
  const shopBrands = BRANDS.filter(b => b.aliases.some(x => shop.includes(x.toLowerCase()))).length;
  const resellerShop = shopBrands > 1 || shop.some(w => w === "parts" || w === "spare" || w === "replacement");
  for (const b of BRANDS) {
    const aliases = b.aliases.map(x => x.toLowerCase());
    const titleHit = aliases.some(x => title.includes(x));
    const supplierHit = aliases.some(x => supplied.includes(x));
    const shopHit = !resellerShop && aliases.some(x => shop.includes(x));
    if ((titleHit && (supplierHit || shopHit)) || (supplierHit && shopHit)) return b;
  }
  return null;
}
