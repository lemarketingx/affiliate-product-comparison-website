import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";
import { getPublicBanners } from "../lib/aliexpress/banners";
import { getUsdRate } from "../lib/dealpilot/fx";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const [snapshot, usdRate, promotions] = await Promise.all([getCatalog(), getUsdRate(), getPublicBanners()]);
  return <DealPilotHome snapshot={snapshot} usdRate={usdRate} banners={promotions} />;
}
