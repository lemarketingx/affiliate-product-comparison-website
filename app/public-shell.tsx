import Link from "next/link";
import {
  ArrowUpLeft,
  Compass,
  Search,
  Menu,
  ShieldCheck,
  House,
  Headphones,
  Car,
  Boxes,
} from "lucide-react";
import { categories } from "../lib/dealpilot/categories";
export function Brand() {
  return (
    <Link className="dp-brand" href="/" aria-label="DealPilot בית">
      <span className="dp-brand-icon">
        <Compass size={25} />
      </span>
      <span dir="ltr">
        deal<strong>pilot</strong>
        <small>פשוט לגלות טוב יותר</small>
      </span>
    </Link>
  );
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dp-public">
      <a className="dp-skip" href="#main">
        דילוג לתוכן
      </a>
      <div className="dp-topline">
        מגלים ב־DealPilot. קונים ב־AliExpress.{" "}
        <Link href="/disclosure">
          איך קישורי השותפים שלנו עובדים <ArrowUpLeft size={12} />
        </Link>
      </div>
      <header className="dp-header">
        <div className="dp-container dp-header-row">
          <Brand />
          <form action="/search" className="dp-header-search" role="search">
            <Search size={19} />
            <input
              name="q"
              maxLength={80}
              placeholder="מה יעשה לכם את היום?"
              aria-label="חיפוש מוצרים"
            />
            <button type="submit" aria-label="חיפוש">
              <ArrowUpLeft size={19} />
            </button>
          </form>
          <nav className="dp-desktop-nav" aria-label="ניווט ראשי">
            <Link href="/deals">גלו מוצרים</Link>
            <Link href="/categories">קטגוריות</Link>
            <Link href="/guides">מדריכים</Link>
          </nav>
          <details className="dp-mobile-menu">
            <summary aria-label="פתיחת תפריט">
              <Menu />
            </summary>
            <nav aria-label="ניווט נייד">
              <Link href="/deals">גלו מוצרים</Link>
              <Link href="/categories">כל הקטגוריות</Link>
              <Link href="/guides">מדריכים</Link>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="dp-footer">
        <div className="dp-container">
          <div className="dp-footer-top">
            <div>
              <Brand />
              <p>
                מוצרים מעניינים. מידע ברור.
                <br />
                עוד דרך לגלות משהו שימושי.
              </p>
            </div>
            <div>
              <strong>לגלות</strong>
              <Link href="/deals">כל המוצרים</Link>
              <Link href="/categories">קטגוריות</Link>
              <Link href="/guides">קונים חכם</Link>
            </div>
            <div>
              <strong>טוב לדעת</strong>
              <Link href="/about">אודות DealPilot</Link>
              <Link href="/disclosure">גילוי שותפים</Link>
              <Link href="/privacy">פרטיות</Link>
              <Link href="/terms">תנאי שימוש</Link>
            </div>
            <div className="dp-footer-note">
              <ShieldCheck size={25} />
              <strong>הבחירה נשארת שלכם.</strong>
              <p>
                ייתכן שנקבל עמלה מקישורים באתר. המחיר, המשלוח והתשלום נקבעים
                ב־AliExpress.
              </p>
            </div>
          </div>
          <div className="dp-footer-bottom">
            <span>© {new Date().getFullYear()} DealPilot</span>
            <span>נבנה בשביל הסקרנות שלכם.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export function CategoryLinks() {
  const icons = [House, Headphones, Car, Boxes];
  return (
    <div className="dp-category-grid">
      {categories.map((c, i) => {
        const Icon = icons[i];
        return (
          <Link
            className={"dp-category-tile tone-" + i}
            href={"/categories/" + c.slug}
            key={c.slug}
          >
            <span className="dp-category-icon">
              <Icon size={32} strokeWidth={1.6} />
            </span>
            <strong>{c.label}</strong>
            <p>{c.description}</p>
            <ArrowUpLeft size={22} />
          </Link>
        );
      })}
    </div>
  );
}
