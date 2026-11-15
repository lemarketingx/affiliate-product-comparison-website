import Link from "next/link";
import { PublicShell } from "./public-shell";
export default function NotFound() {
  return (
    <PublicShell>
      <main id="main" className="og-wrap og-section">
        <div className="og-empty">
          <h1>העמוד לא נמצא</h1>
          <p>אפשר להמשיך לגלות מוצרים בקטלוג.</p>
          <Link className="og-btn" href="/deals">
            לכל המוצרים
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
