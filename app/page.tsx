import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";
import { getPublicBanners } from "../lib/aliexpress/banners";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const [snapshot, banners] = await Promise.all([getCatalog(), getPublicBanners()]);
  return <DealPilotHome snapshot={snapshot} banners={banners} />;
}
