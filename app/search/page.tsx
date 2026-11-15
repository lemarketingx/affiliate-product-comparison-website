import { getCatalog } from "../../lib/aliexpress/catalog";
import { PublicShell } from "../public-shell";
import LiveCatalog from "../live-catalog";
export const dynamic = "force-dynamic";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <PublicShell>
      <main id="main">
        <LiveCatalog
          key={typeof q === "string" ? q : ""}
          snapshot={await getCatalog()}
          initialQuery={typeof q === "string" ? q.slice(0, 80) : ""}
        />
      </main>
    </PublicShell>
  );
}
