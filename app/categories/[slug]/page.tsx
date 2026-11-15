import { notFound } from "next/navigation";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { shelfBySlug } from "../../../lib/dealpilot/shelves";
import { PublicShell } from "../../public-shell";
import LiveCatalog from "../../live-catalog";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = shelfBySlug(slug);
  return {
    title: (s ? s.label + " מהמותגים המובילים" : "קטגוריה") + " | DealPilot",
    alternates: { canonical: "/categories/" + slug },
  };
}
export const dynamic = "force-dynamic";
export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!shelfBySlug(slug)) notFound();
  return (
    <PublicShell>
      <main id="main">
        <LiveCatalog key={slug} snapshot={await getCatalog()} shelf={slug} />
      </main>
    </PublicShell>
  );
}
