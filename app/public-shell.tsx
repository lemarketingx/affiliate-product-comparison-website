import Link from "next/link";
import { ArrowUpLeft, Search, Menu, BadgeCheck } from "lucide-react";
import { brands } from "../lib/dealpilot/brands";
import { Wordmark } from "./og-bits";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="og">
      <a className="og-skip" href="#main">
        דילוג לתוכן
      </a>
      <div className="og-strip">
        <div className="og-wrap og-strip-row">
          <span>
            <BadgeCheck size={15} aria-hidden="true" /> רק מחנויות רשמיות של המותגים
          </span>
          <span className="og-strip-sep" aria-hidden="true" />
          <span className="og-strip-more">מחירים בשקלים, ישר מ־AliExpress</span>
          <Link href="/disclosure" className="og-strip-link">
            גילוי שותפים <ArrowUpLeft size={12} />
          </Link>
        </div>
      </div>
      <header className="og-header">
        <div className="og-wrap og-header-row">
          <Wordmark />
          <form action="/search" className="og-search" role="search">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              maxLength={80}
              placeholder="חפשו מותג או מוצר: שואב, מטען, אוזניות…"
              aria-label="חיפוש מוצרים"
            />
            <button type="submit" aria-label="חיפוש">
              <ArrowUpLeft size={18} />
            </button>
          </form>
          <nav className="og-nav" aria-label="ניווט ראשי">
            <Link href="/brands">מותגים</Link>
            <Link href="/deals">כל המוצרים</Link>
            <Link href="/warranty">אחריות ויבוא</Link>
          </nav>
          <details className="dp-mobile-menu og-menu">
            <summary aria-label="פתיחת תפריט">
              <Menu />
            </summary>
            <nav aria-label="ניווט נייד">
              <Link href="/brands">מותגים</Link>
              <Link href="/deals">כל המוצרים</Link>
              <Link href="/warranty">אחריות ויבוא</Link>
              <Link href="/guides">מדריך קנייה</Link>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="og-footer">
        <div className="og-wrap">
          <div className="og-footer-top">
            <div className="og-footer-brand">
              <Wordmark light />
              <p>
                המותגים שאתם מכירים, מהחנויות הרשמיות שלהם ב־AliExpress. אתר
                גילוי עצמאי בעברית.
              </p>
            </div>
            <div>
              <strong>מותגים</strong>
              {brands.slice(0, 6).map((b) => (
                <Link key={b.slug} href={"/brands/" + b.slug}>
                  {b.he}
                </Link>
              ))}
            </div>
            <div>
              <strong>טוב לדעת</strong>
              <Link href="/warranty">אחריות ויבוא אישי</Link>
              <Link href="/guides">מדריך קנייה</Link>
              <Link href="/about">אודות</Link>
              <Link href="/disclosure">גילוי שותפים</Link>
              <Link href="/privacy">פרטיות</Link>
              <Link href="/terms">תנאי שימוש</Link>
            </div>
            <div className="og-footer-note">
              <strong>שקיפות מלאה</strong>
              <p>
                ייתכן שנקבל עמלה מקישורים באתר, בלי עלות נוספת לכם. DealPilot
                אינו קשור למותגים המוצגים ואינו מוכר את המוצרים. שמות המותגים
                שייכים לבעליהם.
              </p>
            </div>
          </div>
          <div className="og-footer-bottom">
            <span>© {new Date().getFullYear()} DealPilot</span>
            <span>המחיר, המשלוח והאחריות נקבעים ב־AliExpress ואצל המוכר.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Kept for older imports; categories became brands. */
export function CategoryLinks() {
  return <BrandDirectory />;
}

export function BrandDirectory({ counts }: { counts?: Record<string, number> }) {
  return (
    <ol className="og-directory">
      {brands.map((b, i) => (
        <li key={b.slug}>
          <Link href={"/brands/" + b.slug} className="og-dir-item">
            <span className="og-dir-no" dir="ltr">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="og-dir-name" dir="ltr">
              {b.name}
            </span>
            <span className="og-dir-he">{b.he}</span>
            <span className="og-dir-known">{b.knownFor}</span>
            <span className="og-dir-meta">
              {counts && counts[b.slug] ? counts[b.slug] + " מוצרים" : "לחנות המותג"}
              <ArrowUpLeft size={16} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* Used by the admin login page. */
export function Brand() {
  return <Wordmark />;
}
