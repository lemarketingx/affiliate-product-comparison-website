import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";
import { getUsdRate } from "../lib/dealpilot/fx";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const [snapshot, usdRate] = await Promise.all([getCatalog(), getUsdRate()]);
  return <DealPilotHome snapshot={snapshot} usdRate={usdRate} />;
}
