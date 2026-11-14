import DealPilotHome from "./dealpilot-home";
import { getCatalog } from "../lib/aliexpress/catalog";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const snapshot = await getCatalog();
  return <DealPilotHome snapshot={snapshot}/>;
}
