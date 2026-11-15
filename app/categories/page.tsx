export const metadata = {
  title: "קטגוריות | DealPilot",
  alternates: { canonical: "/categories" },
};
import { PublicShell, CategoryLinks } from "../public-shell";
export default function Categories() {
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-section">
        <span className="fp-kicker">שמונה שערים · יעד אחד</span>
        <h1 className="fp-page-title">מאיזה שער ממריאים היום?</h1>
        <p className="fp-lead">
          כל קטגוריה היא שער. בחרו אחד, ותגיעו ללוח המוצרים שלו.
        </p>
        <CategoryLinks />
      </main>
    </PublicShell>
  );
}
