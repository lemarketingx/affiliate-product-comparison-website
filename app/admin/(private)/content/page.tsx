import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getDiscoveredCatalog } from "../../../../lib/aliexpress/catalog";
import ProductWorkbench from "../../product-workbench";
export default async function ContentPage() {
  await requireAdmin();
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">CONTENT STUDIO</span>
          <h1>טיוטה שימושית, מתוך הנתונים.</h1>
          <p className="dp-muted">
            תבניות טקסט למוצרים שאושרו בעבודה המקומית. אין כאן יצירת AI או
            וידאו, ואין פרסום לערוצים.
          </p>
        </div>
      </header>
      <ProductWorkbench
        snapshot={await getDiscoveredCatalog()}
        mode="content"
      />
    </>
  );
}
