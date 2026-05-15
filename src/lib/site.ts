export const siteConfig = {
  name: "השוואה חכמה",
  tagline: "משווים לפני שקונים.",
  description:
    "מרכז השוואות בעברית שעוזר לבחור מוצרים ודילים בצורה ברורה, שקופה ונוחה.",
};

export const navItems = [
  { href: "/", label: "ראשי" },
  { href: "/deals", label: "דילים" },
  { href: "/blog", label: "מדריכים" },
  { href: "/admin", label: "ניהול" },
] as const;

export const categoryCards = [
  {
    title: "גאדג׳טים וטכנולוגיה",
    description: "מקום מסודר להשוואת מוצרים חכמים, אביזרים וציוד שימושי לבית.",
    href: "/category/טכנולוגיה",
  },
  {
    title: "בית ומטבח",
    description: "קטגוריה עתידית למוצרים לבית, אחסון, ניקיון וכלים יומיומיים.",
    href: "/category/בית",
  },
  {
    title: "אופנה ואקססוריז",
    description: "מסגרת להשוואת פריטים לפי מחיר, איכות, משלוח וביקורות.",
    href: "/category/אופנה",
  },
] as const;

export const howItWorks = [
  {
    title: "מחפשים מוצר או קטגוריה",
    description: "המשתמש מתחיל מחיפוש ברור או מקטגוריה, בלי עומס ובלי רעש.",
  },
  {
    title: "משווים נתונים חשובים",
    description: "העמודים מוכנים למחירים, דירוגים, הזמנות וקישורי אפיליאייט.",
  },
  {
    title: "יוצאים לרכישה בביטחון",
    description: "בעתיד כל מעבר לחנות יוצג עם גילוי נאות וקישור מעקב תקין.",
  },
] as const;
