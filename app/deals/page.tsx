import type { Metadata } from "next";
import { getCatalog } from "../../lib/aliexpress/catalog";
import { PublicShell } from "../public-shell";
import LiveCatalog from "../live-catalog";
export const metadata: Metadata = {
  title: "כל המוצרים והמבצעים | DealPilot",
  alternates: { canonical: "/deals" },
};
export const dynamic = "force-dynamic";
export default async function Deals({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const s = ["discount", "orders", "price"].includes(sort ?? "") ? sort! : "source";
  return (
    <PublicShell>
      <main id="main">
        <LiveCatalog
          key={s}
          snapshot={await getCatalog()}
          initialSort={s}
          title={s === "discount" ? "מבצעים חמים: ההנחות הגדולות לפי הספק" : undefined}
        />
      </main>
    </PublicShell>
  );
}
