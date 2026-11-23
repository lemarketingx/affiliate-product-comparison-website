import Link from "next/link";
import { BRANDS, identifyListedBrand } from "../../lib/dealpilot/brands";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { PublicShell } from "../public-shell";
import BrandLogo from "../brand-logo";
import { identifiedProductsCount } from "../../lib/dealpilot/copy";
import { ArrowUpLeft, ShieldAlert } from "lucide-react";
export const dynamic = "force-dynamic";
export const metadata = { title: "מותגים מוכרים ב־AliExpress | DealPilot", description: "מוצרים של מותגים מזוהים ב־AliExpress, עם סינון זהיר ובלי הבטחות לגבי מקוריות או חנויות רשמיות." };
export default async function BrandsPage() {
  const snapshot = await getCatalog();
  const counts = new Map<string, number>();
  for (const item of snapshot.items) {
    const brand = identifyListedBrand(item);
    if (brand) counts.set(brand.slug, (counts.get(brand.slug) ?? 0) + 1);
  }
  const available = BRANDS.filter(b => (counts.get(b.slug) ?? 0) > 0);
  return <PublicShell><main id="main" className="fp-wrap fp-section fp-brands-page">
    <span className="fp-kicker">מותגים ב־DealPilot</span>
    <h1 className="fp-catalog-title">מכירים את המותג. בודקים את המוצר.</h1>
    <p className="fp-lead">אנחנו מציגים רק מוצרים שמזוהים עם רשימת המותגים שבחרנו, לפי הצלבה של שם המוצר ונתוני הספק. לא בדקנו פיזית מקוריות, ואיננו מתחייבים שמדובר במוכר מורשה.</p>
    <p className="fp-notice is-wait"><ShieldAlert size={18} aria-hidden="true"/> שם מותג או חנות בשם “Official” אינם אישור רשמי. בדקו את זהות המוכר, ביקורות ותנאי משלוח לפני הרכישה.</p>
    {available.length ? <div className="fp-brand-grid">
      {available.map(b => <Link key={b.slug} className="fp-brand-card" href={"/brands/" + b.slug}>
        <BrandLogo slug={b.slug} name={b.name}/><span className="fp-brand-count">{identifiedProductsCount(counts.get(b.slug) ?? 0)}</span><span className="fp-brand-card-arrow">למוצרים <ArrowUpLeft size={17}/></span>
      </Link>)}
    </div> : <div className="fp-empty"><h2>מוצרים של מותגים מזוהים עדיין נבדקים</h2><p>הקטלוג מתעדכן בהדרגה. לא נפרסם מוצרים ללא הצלבה גם כדי למלא מקום.</p></div>}
    <p className="fp-fine">רשימת המותגים כוללת {BRANDS.length} מותגים למחקר וגילוי. מוצגים רק מותגים שיש להם כרגע מוצרים שעברו את תנאי הפרסום.</p>
  </main></PublicShell>;
}
