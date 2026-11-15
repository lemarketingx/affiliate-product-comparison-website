import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";
import { getPublicBanners } from "../lib/aliexpress/banners";
import { getUsdRate } from "../lib/dealpilot/fx";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const [snapshot, banners, usdRate] = await Promise.all([getCatalog(), getPublicBanners(), getUsdRate()]);
  return <DealPilotHome snapshot={snapshot} banners={banners} usdRate={usdRate} />;
}
