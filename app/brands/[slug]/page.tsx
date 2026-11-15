import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, Store } from "lucide-react";
import { brands, brandBySlug } from "../../../lib/dealpilot/brands";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { PublicShell } from "../../public-shell";
import LiveCatalog from "../../live-catalog";
import { Guilloche, Seal } from "../../og-bits";

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = brandBySlug(slug);
  if (!b) return { title: "מותג | DealPilot" };
  return {
    title: `${b.he} (${b.name}) מהחנות הרשמית ב־AliExpress | DealPilot`,
    description: `מוצרי ${b.name} מהחנות הרשמית באליאקספרס, במחירים בשקלים: ${b.knownFor}`,
    alternates: { canonical: "/brands/" + slug },
  };
}
export const dynamic = "force-dynamic";
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = brandBySlug(slug);
  if (!b) notFound();
  const snapshot = await getCatalog();
  const own = snapshot.items.filter((p) => p.categorySlug === slug);
  const stores = [...new Set(own.map((p) => p.shopName).filter(Boolean))] as string[];
  return (
    <PublicShell>
      <main id="main">
        <section className="og-brand-hero">
          <Guilloche className="og-brand-bg" size={700} rings={6} />
          <div className="og-wrap og-brand-grid">
            <div>
              <nav className="og-crumbs" aria-label="מיקום">
                <Link href="/brands">מותגים</Link> <span>/</span> <span>{b.he}</span>
              </nav>
              <h1 dir="ltr" className="og-brand-name">{b.name}</h1>
              <p className="og-brand-he">{b.he} · מהחנות הרשמית ב־AliExpress</p>
              <p className="og-brand-known">{b.knownFor}</p>
              <ul className="og-shelves">
                {b.shelves.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <aside className="og-brand-card">
              <Seal id={"brand-" + b.slug} size={96} />
              <h2>{b.storeVerified ? "חנות רשמית מאומתת" : "חנות רשמית לפי שם החנות"}</h2>
              <p>
                {b.storeVerified
                  ? "בדקנו ידנית את החנות הרשמית של המותג ב־AliExpress."
                  : "מוצגים רק מוצרים מחנות שהשם שלה כולל את שם המותג ו־Official Store. עדיין לא אימתנו ידנית את החנות."}
              </p>
              {stores.length > 0 && (
                <ul className="og-store-list">
                  {stores.map((s) => (
                    <li key={s} dir="ltr">
                      {b.storeVerified ? <BadgeCheck size={15} /> : <Store size={15} />} {s}
                    </li>
                  ))}
                </ul>
              )}
              <Link className="og-link" href="/warranty">
                אחריות ביבוא אישי <ArrowUpLeft size={16} />
              </Link>
            </aside>
          </div>
        </section>
        <LiveCatalog
          key={slug}
          snapshot={snapshot}
          initialCategory={slug}
          hideTabs
          title={"כל המוצרים של " + b.he}
        />
      </main>
    </PublicShell>
  );
}
