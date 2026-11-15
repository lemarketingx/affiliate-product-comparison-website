/** Curated brand-first discovery. Search terms narrow candidates only;
 * publicBrandSnapshot must independently validate the returned item. */
export const categories = [
  {
    slug: "tech", label: "טכנולוגיה וטעינה", term: "Baseus",
    terms: ["Baseus", "UGREEN", "Anker charger", "Xiaomi", "Redmi", "POCO", "QCY", "Soundcore", "Edifier", "Ulanzi", "Creality", "Anycubic"],
    description: "מותגים מוכרים באביזרי טעינה, אודיו, סלולר וטכנולוגיה.",
  },
  {
    slug: "home", label: "מותגים לבית", term: "Dreame",
    terms: ["Dreame", "Roborock", "Yeelight", "Reolink", "Xiaomi home"],
    description: "שואבים, תאורה ומוצרי בית חכם ממותגים מזוהים.",
  },
  {
    slug: "car", label: "מותגים לרכב", term: "70mai",
    terms: ["70mai", "VIOFO", "DDPAI", "Baseus car"],
    description: "מצלמות דרך ואביזרי רכב ממותגים מוכרים.",
  },
  {
    slug: "sport", label: "כושר וטיולים", term: "Amazfit",
    terms: ["Amazfit", "Naturehike", "ROCKBROS"],
    description: "ציוד כושר וטיולים ממותגים מוכרים.",
  },
] as const;
