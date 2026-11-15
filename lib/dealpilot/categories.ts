export const categories = [
  {
    slug: "fashion",
    label: "אופנה ואביזרים",
    term: "fashion accessories",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["fashion accessories", "women handbag", "sunglasses", "men wallet", "jewelry set"],
    description: "תיקים, צעיפים ואביזרים קטנים להשלמת ההופעה.",
  },
  {
    slug: "tech",
    label: "גאדג׳טים וטכנולוגיה",
    term: "laptop accessories",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["laptop accessories", "phone holder", "usb c hub", "wireless earbuds", "phone case"],
    description: "אביזרים שימושיים למחשב, לטלפון ולשולחן העבודה.",
  },
  {
    slug: "home",
    label: "בית ומטבח",
    term: "kitchen tools",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["kitchen tools", "kitchen gadgets", "bathroom accessories", "led strip light", "home decor"],
    description: "פריטים שימושיים למרחב שבו הכול מתחיל.",
  },
  {
    slug: "beauty",
    label: "אביזרי טיפוח",
    term: "makeup brushes",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["makeup brushes", "nail art", "hair accessories", "makeup organizer", "skin care tools"],
    description: "מברשות, תיקי איפור ואביזרים לשגרת הטיפוח.",
  },
  {
    slug: "games",
    label: "משחקים ופנאי",
    term: "educational puzzle",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["educational puzzle", "building blocks", "board game", "fidget toy", "rc car"],
    description: "רעיונות לערב משחקים ולזמן פנוי ביחד.",
  },
  {
    slug: "sport",
    label: "ספורט וטיולים",
    term: "fitness accessories",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["fitness accessories", "yoga mat", "cycling accessories", "camping gear", "resistance bands"],
    description: "אביזרים לאימון, להליכה וליציאה מהבית.",
  },
  {
    slug: "car",
    label: "רכב ואביזרים",
    term: "car accessories",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["car accessories", "car phone holder", "car organizer", "car cleaning", "car interior accessories"],
    description: "מגלים פתרונות לדרך ולרכב.",
  },
  {
    slug: "organization",
    label: "סדר וארגון",
    term: "home organizer",
    // Catalog search phrases, first one is the original discovery term.
    terms: ["home organizer", "storage box", "drawer organizer", "closet organizer", "cable organizer"],
    description: "מקום לכל דבר, וקצת יותר מקום בבית.",
  },
] as const;
