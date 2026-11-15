import type { Metadata } from "next";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { PublicShell } from "../public-shell";
import LiveCatalog from "../live-catalog";
export const metadata: Metadata = {
  title: "גלו מוצרים | DealPilot",
  alternates: { canonical: "/deals" },
};
export const dynamic = "force-dynamic";
export default async function Deals() {
  return (
    <PublicShell>
      <main id="main">
        <LiveCatalog snapshot={await getCatalog()} />
      </main>
    </PublicShell>
  );
}
