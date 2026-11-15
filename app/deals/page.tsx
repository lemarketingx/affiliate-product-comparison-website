import type { Metadata } from "next";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { categories } from "../../lib/dealpilot/categories";
import { parseViewParams } from "../../lib/aliexpress/catalog-view";
import { PublicShell } from "../public-shell";
import CatalogBrowser from "../catalog-browser";
export const metadata: Metadata = {
  title: "גלו מוצרים | DealPilot",
  alternates: { canonical: "/deals" },
};
export const dynamic = "force-dynamic";
export default async function Deals({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseViewParams(await searchParams, categories.map((c) => c.slug));
  return (
    <PublicShell>
      <main id="main">
        <CatalogBrowser snapshot={await getCatalog()} params={params} base="/deals" />
      </main>
    </PublicShell>
  );
}
