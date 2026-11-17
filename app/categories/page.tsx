import { PublicShell, CategoryLinks } from "../public-shell";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { liveCategorySlugs } from "../../lib/dealpilot/categories";
import { BRAND } from "../../lib/brand";
export const metadata = {
  title: "קטגוריות | " + BRAND.name,
  alternates: { canonical: "/categories" },
};
export const dynamic = "force-dynamic";
export default async function Categories() {
  const catalog = await getCatalog();
  const live = liveCategorySlugs(catalog.items);
  return (
    <PublicShell>
      <main id="main" className="bl-page">
        <h1 className="bl-page-title">קטגוריות</h1>
        <p className="bl-page-lead">רק תחומים שיש בהם כרגע מוצרי מותגים שעברו את הבדיקות שלנו.</p>
        {live.size ? <CategoryLinks live={live} /> : <p className="bl-empty-note">הקטלוג מתעדכן כרגע. נסו שוב בעוד כמה דקות.</p>}
      </main>
    </PublicShell>
  );
}
