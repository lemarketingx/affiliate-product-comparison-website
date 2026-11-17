import Link from "next/link";
import { PublicShell } from "./public-shell";
export default function NotFound() {
  return (
    <PublicShell>
      <main id="main" className="bl-state">
        <div className="bl-state-card">
          <span className="bl-state-mark" aria-hidden="true">404</span>
          <h1>העמוד לא נמצא</h1>
          <p>ייתכן שהמוצר הוסר מהקטלוג או שהכתובת השתנתה.</p>
          <form action="/search" role="search" className="bl-state-search">
            <input name="q" maxLength={80} aria-label="חיפוש מוצר" placeholder="חפשו מותג או מוצר" />
            <button type="submit" className="bl-cta">חיפוש</button>
          </form>
          <Link className="bl-cta is-ghost" href="/deals">
            לכל המוצרים
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
