/** Curated brand-first discovery. Search terms narrow candidates only;
 * publicBrandSnapshot must independently validate the returned item. */
export const categories = [
  {
    slug: "tech", label: "טכנולוגיה וטעינה", term: "Baseus",
    // Expansion 2026-11-17 (docs/CATALOG-EXPANSION.md): model-level terms for brands whose
    // official stores already pass the rules; the bare "Baseus" term returned unrelated items.
    terms: ["UGREEN", "UGREEN Nexode", "UGREEN USB C hub", "UGREEN earbuds", "Baseus charger", "Baseus power bank", "Baseus earbuds",
      "QCY", "QCY earbuds", "Toocki", "Vention", "Haylou", "SoundPEATS", "ESSAGER", "Moondrop", "1MORE", "Nothing Ear",
      // Product-level terms: bare brand searches return mostly compatible accessories.
      "Anker power bank", "Soundcore earbuds", "Amazfit smart watch", "Soundcore", "Edifier", "Anker charger", "Xiaomi", "Xiaomi Smart Band", "Xiaomi Mijia", "Xiaomi TV Box", "Redmi", "Redmi Buds", "Redmi Watch", "POCO", "POCO smartphone", "Ulanzi", "Creality", "Anycubic",
      // 2026-11-23: all 57 terms were exhausted. Model-level terms for the brands with the most
      // published products and reported sales (live DB), plus three brands added from store data.
      "UGREEN cable", "UGREEN power bank", "UGREEN charger", "Baseus cable", "Baseus magnetic power bank",
      "ESSAGER charger", "ESSAGER cable", "Toocki charger", "Toocki cable", "Vention cable", "Vention HDMI",
      "Ulanzi tripod", "Ulanzi light", "Moondrop earphones", "QCY smart watch", "Haylou smart watch",
      "CMF Buds", "CMF Watch", "Hagibis", "Rocoren"],
    description: "מותגים מוכרים באביזרי טעינה, אודיו, סלולר וטכנולוגיה.",
  },
  {
    slug: "home", label: "מותגים לבית", term: "Dreame",
    terms: ["Dreame", "Roborock", "Yeelight", "Reolink", "Xiaomi home", "Xiaomi Mijia sensor", "Xiaomi smart home hub", "Dreame robot vacuum", "Roborock robot vacuum", "Reolink camera", "Yeelight lamp"],
    description: "שואבים, תאורה ומוצרי בית חכם ממותגים מזוהים.",
  },
  {
    slug: "car", label: "מותגים לרכב", term: "70mai",
    terms: ["70mai", "VIOFO", "DDPAI", "Baseus car", "Baseus car holder", "Baseus car charger",
      "70mai dash cam", "DDPAI dash cam", "Baseus car vacuum", "ESSAGER car charger"],
    description: "אביזרי רכב ממותגים מוכרים: טעינה, אחיזה ומשאבות.",
  },
  {
    slug: "sport", label: "כושר וטיולים", term: "Amazfit",
    terms: ["Amazfit", "Naturehike", "ROCKBROS", "ROCKBROS bike light", "ROCKBROS cycling bag",
      "ROCKBROS cycling glasses", "ROCKBROS cycling gloves", "Naturehike tent", "Naturehike sleeping bag", "Naturehike chair"],
    description: "ציוד כושר וטיולים ממותגים מוכרים.",
  },
] as const;

/** Category slugs that hold at least one listed (verified) product. A category
 * with none is not shown in navigation, tabs or banners, and its page 404s. */
export function liveCategorySlugs(items: readonly { categorySlug?: string | null }[]): Set<string> {
  const out = new Set<string>();
  for (const i of items) if (i.categorySlug) out.add(i.categorySlug);
  return out;
}
