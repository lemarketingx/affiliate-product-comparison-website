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
  { slug: "ulanzi", name: "Ulanzi", aliases: ["ulanzi", "אולנזי"], category: "tech" },
  { slug: "creality", name: "Creality", aliases: ["creality"], category: "tech" },
  { slug: "anycubic", name: "Anycubic", aliases: ["anycubic"], category: "tech" },
  // Added 2026-11-17 from catalog data: 4 brand-run stores, 2 items >5,000 reported sales, 9% commission.
  { slug: "toocki", name: "Toocki", aliases: ["toocki"], category: "tech" },
  // Added 2026-11-18 from catalog data: official/flagship AliExpress stores with
  // products above the 500-sales threshold and the brand in the title.
  { slug: "vention", name: "Vention", aliases: ["vention"], category: "tech" },
  { slug: "haylou", name: "Haylou", aliases: ["haylou"], category: "tech" },
  { slug: "soundpeats", name: "SoundPEATS", aliases: ["soundpeats"], category: "tech" },
  { slug: "essager", name: "ESSAGER", aliases: ["essager"], category: "tech" },
  { slug: "moondrop", name: "Moondrop", aliases: ["moondrop"], category: "tech" },
  { slug: "1more", name: "1MORE", aliases: ["1more"], category: "tech" },
  // "cmf" (CMF by Nothing) added 2026-11-23: 10 products above 500 sales from
  // "Nothing Online Store" / "Nothing Flagship Store" titled "CMF Buds/Watch".
  { slug: "nothing", name: "Nothing", aliases: ["nothing", "cmf"], category: "tech" },
  // Added 2026-11-23 from catalog data: each has an "Official Store" whose products
  // above 500 sales carry the brand in the title (docs/CATALOG-EXPANSION.md).
  { slug: "hagibis", name: "Hagibis", aliases: ["hagibis"], category: "tech" },
  { slug: "rocoren", name: "Rocoren", aliases: ["rocoren"], category: "tech" },
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
  // Sister brands from one maker count once (a "Xiaomi Redmi Store" is still one maker).
  const family = (slug: string) => (slug === "redmi" || slug === "poco" ? "xiaomi" : slug === "soundcore" ? "anker" : slug);
  const shopBrands = new Set(BRANDS.filter(b => b.aliases.some(x => shop.includes(x.toLowerCase()))).map(b => family(b.slug))).size;
  const resellerShop = shopBrands > 1 || shop.some(w => w === "parts" || w === "spare" || w === "replacement");
  // A compatible accessory is not necessarily manufactured by Xiaomi/Redmi/POCO.
  // These phrases signal compatibility, not a manufacturer claim, even if the
  // storefront happens to mention the device brand in its own name.
  const compatibleAccessory = /(?:\b(?:for|compatible\s+with|replacement\s+for|fits)\s+(?:xiaomi|redmi|poco)\b|(?:תואם|מתאים|עבור)\s+ל?(?:שיאומי|רדמי|פוקו))/i.test(input.title);
  for (const b of BRANDS) {
    if (compatibleAccessory && family(b.slug) === "xiaomi") continue;
    const aliases = b.aliases.map(x => x.toLowerCase());
    const titleHit = aliases.some(x => title.includes(x));
    const supplierHit = aliases.some(x => supplied.includes(x));
    const shopHit = !resellerShop && aliases.some(x => shop.includes(x));
    if ((titleHit && (supplierHit || shopHit)) || (supplierHit && shopHit)) return b;
  }
  return null;
}
