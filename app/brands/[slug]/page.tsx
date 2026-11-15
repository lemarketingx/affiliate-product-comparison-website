import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS, identifyListedBrand } from "../../../lib/dealpilot/brands";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { getUsdRate } from "../../../lib/dealpilot/fx";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
import { ShieldAlert } from "lucide-react";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = BRANDS.find(x => x.slug === slug);
  return { title: (b?.name ?? "מותגים") + " ב־AliExpress | DealPilot" };
}
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = BRANDS.find(x => x.slug === slug);
  if (!brand) notFound();
  const [snap, rate] = await Promise.all([getCatalog(), getUsdRate()]);
  const items = snap.items.filter(x => identifyListedBrand(x)?.slug === slug);
  return <PublicShell><main id="main" className="fp-wrap fp-section fp-brands-page">
    <nav className="fp-crumbs"><Link href="/">בית</Link> / <Link href="/brands">מותגים</Link> / <span dir="ltr">{brand.name}</span></nav>
    <span className="fp-kicker">מותג מזוהה · נתוני ספק מוצלבים</span>
    <h1 className="fp-catalog-title" dir="ltr">{brand.name}</h1>
    <p className="fp-lead">מוצרי {brand.name} שנמצאו ב־Affiliate API ועברו את הסינון המחמיר שלנו. זיהוי מותג אינו הוכחה למקוריות או לחנות מורשית.</p>
    <p className="fp-notice is-wait"><ShieldAlert size={18} aria-hidden="true" /> בדקו את שם המוכר, ביקורות הקונים ותנאי משלוח לישראל לפני תשלום.</p>
    {items.length ? <div className="fp-grid">{items.map(item => <ProductCard key={item.id} item={item} usdRate={rate} />)}</div>
      : <div className="fp-empty"><h2>לא נמצאו כרגע מוצרים שעברו את בדיקת המותג</h2><p>לא נציג מוצרים ממוכרים לא מזוהים רק כדי למלא את העמוד.</p><Link href="/brands">לכל המותגים</Link></div>}
  </main></PublicShell>;
}
