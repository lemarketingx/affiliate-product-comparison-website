import type { Metadata } from "next";
import { PublicShell } from "../public-shell";
import { FavoritesList } from "../favorites";
export const metadata: Metadata = { title: "המועדפים שלי | DealPilot", robots: { index: false } };
export default function Saved() {
  return (
    <PublicShell>
      <main id="main" className="og-wrap og-section">
        <span className="og-kicker">נשמר רק בדפדפן הזה</span>
        <h1 className="og-page-title">המועדפים שלי</h1>
        <FavoritesList />
      </main>
    </PublicShell>
  );
}
