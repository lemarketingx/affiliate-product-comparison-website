import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS, identifyListedBrand } from "../../../lib/dealpilot/brands";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { getUsdRate } from "../../../lib/dealpilot/fx";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
import BrandLogo from "../../brand-logo";
import { ShieldAlert } from "lucide-react";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdString } from "../../../lib/seo/structured-data";
import { siteOrigin } from "../../../lib/site-url";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = BRANDS.find(x => x.slug === slug);
  return { title: (b?.name ?? "מותגים") + " ב־AliExpress | DealPilot", description: b ? `מוצרי ${b.name} ב־AliExpress: מחירים בשקלים, זמן בדיקה, נתוני מכירות ספק ומידע לקנייה לישראל.` : "מוצרי מותגים ב־AliExpress", alternates: { canonical: "/brands/" + slug } };
}
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = BRANDS.find(x => x.slug === slug);
  if (!brand) notFound();
  const [snap, rate] = await Promise.all([getCatalog(), getUsdRate()]);
  const items = snap.items.filter(x => identifyListedBrand(x)?.slug === slug);
  const origin = siteOrigin();
  const ld = [breadcrumbJsonLd(origin, [{ name: "בית", path: "/" }, { name: "מותגים", path: "/brands" }, { name: brand.name, path: "/brands/" + slug }]),
    ...(items.length ? [itemListJsonLd(origin, items.map(i => i.id))] : [])];
  return <PublicShell><main id="main" className="fp-wrap fp-section fp-brands-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
    <nav className="fp-crumbs"><Link href="/">בית</Link> / <Link href="/brands">מותגים</Link> / <span dir="ltr">{brand.name}</span></nav>
    <header className="sr-brand-band">
    <span className="fp-kicker">מותג מזוהה · נתוני ספק מוצלבים</span>
    <h1 className="fp-catalog-title dp-brand-heading"><BrandLogo slug={brand.slug} name={brand.name}/></h1>
    {items.length > 0 && <ul className="sr-brand-stats" aria-label={"נתוני " + brand.name + " בקטלוג"}>
      <li><b>{items.length.toLocaleString("he-IL")}</b> מוצרים בקטלוג</li>
      <li>מחיר בשקלים עם זמן בדיקה</li>
      <li>אומדן מסי יבוא לכל מוצר</li>
    </ul>}
    <p className="fp-lead">מוצרי {brand.name} שאותרו ב־AliExpress וסוננו לפי נתוני המוצר והחנות. השוו מחיר בשקלים, בדקו מכירות מדווחות ובחרו את הדגם המתאים. זיהוי מותג אינו אישור מקוריות או מוכר מורשה.</p>
    </header>
    <p className="fp-notice is-wait"><ShieldAlert size={18} aria-hidden="true" /> בדקו את שם המוכר, ביקורות הקונים ותנאי משלוח לישראל לפני תשלום.</p>
    {items.length ? <div className="fp-grid">{items.map(item => <ProductCard key={item.id} item={item} usdRate={rate} />)}</div>
      : <div className="fp-empty"><h2>לא נמצאו כרגע מוצרים שעברו את בדיקת המותג</h2><p>לא נציג מוצרים ממוכרים לא מזוהים רק כדי למלא את העמוד.</p><Link href="/brands">לכל המותגים</Link></div>}
  </main></PublicShell>;
}
