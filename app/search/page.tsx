import { getCatalog } from "../../lib/aliexpress/catalog";
import { categories } from "../../lib/dealpilot/categories";
import { getUsdRate } from "../../lib/dealpilot/fx";
import { parseViewParams } from "../../lib/aliexpress/catalog-view";
import { PublicShell } from "../public-shell";
import CatalogBrowser from "../catalog-browser";
export const dynamic = "force-dynamic";
export const metadata = { title: "חיפוש | DealPilot" };
export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [catalog, usdRate] = await Promise.all([getCatalog(), getUsdRate()]);
  const params = parseViewParams(await searchParams, categories.map((c) => c.slug));
  return (
    <PublicShell>
      <main id="main">
        <CatalogBrowser
          snapshot={catalog}
          usdRate={usdRate}
          params={params}
          base="/search"
          title={params.q ? `תוצאות עבור "${params.q}"` : "חיפוש בקטלוג"}
        />
      </main>
    </PublicShell>
  );
}
