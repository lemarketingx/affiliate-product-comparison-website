import { siteOrigin } from "../lib/site-url";
import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";
import { getPublicBanners } from "../lib/aliexpress/banners";
import { getUsdRate } from "../lib/dealpilot/fx";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function HomePage() {
  const [snapshot, usdRate, promotions] = await Promise.all([getCatalog(), getUsdRate(), getPublicBanners()]);
  const origin = siteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": origin + "/#website",
    name: "DealPilot",
    url: origin + "/",
    inLanguage: "he-IL",
    description: "השוואת מחירים ומידע על מוצרי מותגים ב-AliExpress לקונים בישראל.",
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <DealPilotHome snapshot={snapshot} usdRate={usdRate} banners={promotions} />
  </>;
}
