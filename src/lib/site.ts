export const siteConfig = {
  name: "דיל־זון",
  tagline: "מגלים מוצרים שווים. קונים חכם.",
  description:
    "מנוע גילוי דילים והשוואות בעברית, עם חוויית קנייה מהירה, שקופה ומותאמת לנייד.",
};

export const navItems = [
  { href: "/", label: "ראשי" },
  { href: "/deals", label: "דילים" },
  { href: "/blog", label: "מדריכים" },
  { href: "/admin", label: "פרופיל" },
] as const;

export const categoryChips = [
  { label: "הכל", href: "/deals", active: true },
  { label: "גאדג׳טים", href: "/category/גאדג׳טים" },
  { label: "לבית", href: "/category/בית" },
  { label: "טיפוח", href: "/category/טיפוח" },
  { label: "ספורט", href: "/category/ספורט" },
] as const;

export const categoryCards = [
  {
    title: "גאדג׳טים חכמים",
    description: "אזור להשוואת מוצרים קטנים, שימושיים ומפתיעים.",
    href: "/category/גאדג׳טים",
  },
  {
    title: "בית ומטבח",
    description: "מוצרים לבית, אחסון, ניקיון ושדרוגים יומיומיים.",
    href: "/category/בית",
  },
  {
    title: "אופנה וטיפוח",
    description: "השוואות עתידיות לפריטים, אביזרים ומוצרי טיפוח.",
    href: "/category/טיפוח",
  },
] as const;

export const placeholderDeals = [
  {
    badge: "מומלץ",
    tone: "sage",
    title: "מוצר מומלץ",
    description: "המחיר יתעדכן אוטומטית",
  },
  {
    badge: "דיל חם",
    tone: "dark",
    title: "מוצר מומלץ",
    description: "בדיקת מוצר",
  },
  {
    badge: "נבדק",
    tone: "cream",
    title: "מוצר מומלץ",
    description: "המחיר יתעדכן אוטומטית",
  },
  {
    badge: "חדש",
    tone: "silver",
    title: "מוצר מומלץ",
    description: "בדיקת מוצר",
  },
] as const;

export const viralStories = [
  {
    title: "הגאדג׳ט שכולם בודקים השבוע",
    label: "טרנדי",
    tone: "neon",
  },
  {
    title: "חובה בכל מטבח ישראלי",
    label: "חם",
    tone: "warm",
  },
] as const;

export const guidePreviews = [
  {
    title: "איך לזהות מוצר שבאמת שווה לקנות?",
    description: "כל מה שצריך לבדוק לפני הקליק",
  },
  {
    title: "מה כדאי לבדוק לפני שמשווים מחירים?",
    description: "מדריך קצר לטווח מחירים ומשלוחים",
  },
  {
    title: "גאדג׳טים שימושיים שלא הכרתם",
    description: "רעיונות למוצרים שיכולים לשדרג את היום",
  },
] as const;

export const trustItems = [
  "מוצרים מעניינים במקום אחד",
  "חוויית קנייה פשוטה ומהירה",
  "גילוי נאות בקישורי אפיליאייט",
] as const;
