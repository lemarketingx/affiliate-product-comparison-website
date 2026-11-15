import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, Store } from "lucide-react";
import { brands, brandBySlug } from "../../../lib/dealpilot/brands";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { PublicShell } from "../../public-shell";
import LiveCatalog from "../../live-catalog";
import { shelves } from "../../../lib/dealpilot/shelves";

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = brandBySlug(slug);
  if (!b) return { title: "מותג | DealPilot" };
  return {
    title: `${b.he} (${b.name}) מחנות ששמה תואם למותג ב־AliExpress | DealPilot`,
    description: `מוצרי ${b.name} מחנות ששמה תואם למותג באליאקספרס, במחירים בשקלים: ${b.knownFor}`,
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
        <section className="og-wrap">
          <div className="og-brand-hero" style={{ "--accent": b.accent } as React.CSSProperties}>
            <div className="og-brand-copy">
              <nav className="og-crumbs" aria-label="מיקום">
                <Link href="/brands">מותגים</Link> <span>/</span> <span>{b.he}</span>
              </nav>
              <h1 dir="ltr" className="og-brand-name">
                {b.logo ? (
                  <span className="og-brand-logo">
                    <img src={b.logo} alt={b.name} />
                  </span>
                ) : (
                  b.name
                )}
              </h1>
              <p className="og-brand-he">{b.he} · מחנות ששמה תואם למותג ב־AliExpress</p>
              <p className="og-brand-known">{b.knownFor}</p>
              <ul className="og-shelves">
                {shelves
                  .filter((s) => own.some((p) => p.shelf === s.slug))
                  .map((s) => (
                    <li key={s.slug}>
                      <Link href={"/categories/" + s.slug}>{s.label}</Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="og-brand-art" aria-hidden="true">
              {own.slice(0, 3).map((p, k) =>
                p.image ? (
                  <span className={"og-slide-img k" + k} key={p.id}>
                    <img src={p.image} alt="" referrerPolicy="no-referrer" />
                  </span>
                ) : null,
              )}
            </div>
            <aside className="og-brand-card">
              <strong>
                {b.storeVerified ? <BadgeCheck size={17} /> : <Store size={17} />}{" "}
                {b.storeVerified ? "חנות שנבדקה ידנית" : "שם החנות תואם למותג"}
              </strong>
              <p>
                {b.storeVerified
                  ? "בדקנו ידנית את החנות הרשמית של המותג ב־AliExpress."
                  : "מוצגים רק מוצרים מחנות ששמה כולל את שם המותג ו־Official Store. עדיין לא אימתנו ידנית את החנות."}
              </p>
              {stores.length > 0 && (
                <ul className="og-store-list">
                  {stores.map((s) => (
                    <li key={s} dir="ltr">{s}</li>
                  ))}
                </ul>
              )}
              <Link className="og-link" href="/warranty">
                אחריות ביבוא אישי <ArrowUpLeft size={15} />
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
