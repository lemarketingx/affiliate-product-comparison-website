import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getDiscoveredCatalog } from "../../../../lib/aliexpress/catalog";
import ScoutSearch from "../../scout-search";
export default async function DiscoveryPage() {
  await requireAdmin();
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">PRODUCT SCOUT</span>
          <h1>מוצרים עם נתונים. מקום לשיקול דעת.</h1>
          <p className="dp-muted">
            גילוי מוצרים מהספק, בדיקת שלמות נתונים ושיקול דעת אנושי.
          </p>
        </div>
      </header>
      <ScoutSearch initial={await getDiscoveredCatalog()} />
    </>
  );
}
