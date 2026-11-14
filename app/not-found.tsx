import Link from "next/link";
import { PublicShell } from "./public-shell";
export default function NotFound() {
  return (
    <PublicShell>
      <main id="main" className="dp-container dp-section">
        <div className="dp-empty">
          <h1>העמוד לא נמצא</h1>
          <p>אפשר להמשיך לגלות מוצרים בקטלוג.</p>
          <Link className="dp-btn" href="/deals">
            לכל המוצרים
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
