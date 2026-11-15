import { notFound } from "next/navigation";
import { categories } from "../../../lib/dealpilot/categories";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { parseViewParams } from "../../../lib/aliexpress/catalog-view";
import { PublicShell } from "../../public-shell";
import CatalogBrowser from "../../catalog-browser";
export const dynamic = "force-dynamic";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const c = categories.find((c) => c.slug === slug);
  if (!c) notFound();
  const view = parseViewParams(await searchParams, categories.map((x) => x.slug));
  return (
    <PublicShell>
      <main id="main">
        <CatalogBrowser
          snapshot={await getCatalog()}
          params={view}
          base={"/categories/" + slug}
          lockedCategory={slug}
          title={c.label}
        />
      </main>
    </PublicShell>
  );
}
