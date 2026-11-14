export const metadata = {
  title: "קטגוריות | DealPilot",
  alternates: { canonical: "/categories" },
};
import { PublicShell, CategoryLinks } from "../public-shell";
export default function Categories() {
  return (
    <PublicShell>
      <main id="main" className="dp-container dp-section">
        <span className="dp-eyebrow">A PLACE FOR EVERYTHING</span>
        <h1 className="dp-page-title">מה מסקרן אתכם היום?</h1>
        <p className="dp-muted" style={{ marginBottom: 30 }}>
          ארבע דרכים לגלות מוצרים שמתאימים ליום־יום שלכם.
        </p>
        <CategoryLinks />
      </main>
    </PublicShell>
  );
}
