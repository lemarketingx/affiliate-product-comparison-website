import { PublicShell, CategoryLinks, type CategoryInfo } from "../public-shell";
import { identifyListedBrand } from "../../lib/dealpilot/brands";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { liveCategorySlugs } from "../../lib/dealpilot/categories";
import { BRAND } from "../../lib/brand";
export const metadata = {
  title: "קטגוריות מוצרים ומותגים | " + BRAND.name,
  description: "מגלים מוצרי מותגים לפי תחום, עם מחירים בשקלים ומידע לקנייה חכמה ב־AliExpress.",
  alternates: { canonical: "/categories" },
};
export const dynamic = "force-dynamic";
export default async function Categories() {
  const catalog = await getCatalog();
  const live = liveCategorySlugs(catalog.items);
  // Real counts per category and its brands, most products first.
  const info = new Map<string, CategoryInfo>();
  const brandTally = new Map<string, Map<string, { slug: string; name: string; n: number }>>();
  for (const p of catalog.items) {
    const row = info.get(p.categorySlug) ?? { count: 0, brands: [] };
    row.count++;
    info.set(p.categorySlug, row);
    const b = identifyListedBrand(p);
    if (!b) continue;
    const t = brandTally.get(p.categorySlug) ?? new Map();
    const e = t.get(b.slug) ?? { slug: b.slug, name: b.name, n: 0 };
    e.n++;
    t.set(b.slug, e);
    brandTally.set(p.categorySlug, t);
  }
  for (const [slug, t] of brandTally) {
    const row = info.get(slug);
    if (row) row.brands = [...t.values()].sort((a, b) => b.n - a.n).map(({ slug, name }) => ({ slug, name }));
  }
  return (
    <PublicShell>
      <main id="main" className="bl-page sr-cats-page">
        <h1 className="bl-page-title">קטגוריות</h1>
        <p className="bl-page-lead">רק תחומים שיש בהם כרגע מוצרי מותגים שעברו את הבדיקות שלנו.</p>
        {live.size ? <CategoryLinks live={live} info={info} /> : <p className="bl-empty-note">הקטלוג מתעדכן כרגע. נסו שוב בעוד כמה דקות.</p>}
      </main>
    </PublicShell>
  );
}
