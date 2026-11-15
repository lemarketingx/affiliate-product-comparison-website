import type { Metadata } from "next";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { PublicShell, BrandDirectory } from "../public-shell";
import { brands } from "../../lib/dealpilot/brands";
export const metadata: Metadata = {
  title: "מותגים | DealPilot",
  description: "שיאומי, אנקר, יוגרין, דרימי ועוד: מוצרים מהחנויות הרשמיות של המותגים ב־AliExpress, במחירים בשקלים.",
  alternates: { canonical: "/brands" },
};
export const dynamic = "force-dynamic";
export default async function Brands() {
  const snapshot = await getCatalog();
  const counts: Record<string, number> = {};
  for (const p of snapshot.items) counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;
  return (
    <PublicShell>
      <main id="main" className="og-wrap og-section">
        <span className="og-kicker">{brands.length} מותגים · רק חנויות רשמיות</span>
        <h1 className="og-page-title">אינדקס המותגים.</h1>
        <p className="og-lead">
          בחרו מותג ותראו רק מוצרים מהחנות הרשמית שלו ב־AliExpress. DealPilot
          אינו קשור למותגים; השמות מופיעים כדי לזהות את המוצרים.
        </p>
        <BrandDirectory counts={counts} />
      </main>
    </PublicShell>
  );
}
