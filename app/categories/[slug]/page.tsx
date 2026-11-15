import { notFound } from "next/navigation";
import { categories } from "../../../lib/dealpilot/categories";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { PublicShell } from "../../public-shell";
import LiveCatalog from "../../live-catalog";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = categories.find((c) => c.slug === slug);
  return {
    title: (c?.label ?? "קטגוריה") + " | DealPilot",
    alternates: { canonical: "/categories/" + slug },
  };
}
export default async function Category({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!categories.some((c) => c.slug === slug)) notFound();
  return (
    <PublicShell>
      <main id="main">
        <LiveCatalog key={slug} snapshot={await getCatalog()} initialCategory={slug} />
      </main>
    </PublicShell>
  );
}
