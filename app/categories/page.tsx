import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { shelves } from "../../lib/dealpilot/shelves";
import { PublicShell } from "../public-shell";
export const metadata: Metadata = {
  title: "קטגוריות | DealPilot",
  alternates: { canonical: "/categories" },
};
export const dynamic = "force-dynamic";
export default async function Categories() {
  const items = (await getCatalog()).items;
  return (
    <PublicShell>
      <main id="main" className="og-wrap og-section">
        <span className="og-kicker">כל הקטגוריות</span>
        <h1 className="og-page-title">מה מחפשים היום?</h1>
        <p className="og-lead">כל קטגוריה מרכזת מוצרים מכמה מותגים, רק מהחנויות הרשמיות שלהם.</p>
        <ul className="og-tiles">
          {shelves.map((s) => {
            const list = items.filter((p) => p.shelf === s.slug);
            return (
              <li key={s.slug}>
                <Link href={"/categories/" + s.slug} className="og-tile">
                  <div className="og-tile-copy">
                    <strong>{s.label}</strong>
                    <span>{s.blurb}</span>
                    <em>
                      {list.length ? list.length + " מוצרים" : "לקטגוריה"} <ChevronLeft size={14} />
                    </em>
                  </div>
                  <div className="og-tile-img">
                    {list[0]?.image && <img src={list[0].image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </PublicShell>
  );
}
