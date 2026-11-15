import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getDiscoveredCatalog } from "../../../../lib/aliexpress/catalog";
import ProductWorkbench from "../../product-workbench";
export default async function ProductsPage() {
  await requireAdmin();
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">PRODUCT REVIEW</span>
          <h1>מגילוי להחלטה</h1>
          <p className="dp-muted">
            בדקו את המקור, ערכו את הטקסט והכינו טיוטה. אישור כאן תקף לעבודה
            בלשונית בלבד.
          </p>
        </div>
      </header>
      <ProductWorkbench snapshot={await getDiscoveredCatalog()} />
    </>
  );
}
