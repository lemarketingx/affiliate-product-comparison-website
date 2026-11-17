import Link from "next/link";
import { ArrowUpLeft, Search, Menu, House, Headphones, Car, Dumbbell } from "lucide-react";
import { categories } from "../lib/dealpilot/categories";
import { BRAND } from "../lib/brand";

/** The symbol: a price tag with a check, over the "bottom line" bar. Name-neutral. */
export function BrandSymbol({ size = 34, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? "#FAFAF7" : "#121417";
  const fg = inverted ? "#121417" : "#FAFAF7";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill={bg} />
      <path d="M24 13h24a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H24L11 26z" fill={fg} />
      <circle cx="22" cy="26" r="3.6" fill={bg} />
      <path d="M29 26.5l4 4 8-9" fill="none" stroke={bg} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="46" width="40" height="6.5" rx="3.25" fill="#FFD43B" />
    </svg>
  );
}

/** Logo lockup: symbol + the (swappable) brand name from lib/brand.ts. */
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={"bl-brand" + (light ? " is-light" : "")} href="/" aria-label={BRAND.name + " בית"}>
      <BrandSymbol inverted={light} />
      <span className="bl-wordmark" dir="auto">{BRAND.name}</span>
    </Link>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fp bl-shell">
      <a className="fp-skip" href="#main">
        דילוג לתוכן
      </a>
      <div className="bl-topline">
        <div className="bl-wrap">
          <span>מחירים שנבדקים כל יום · קישורים שנבדקו · בלי אחוזי הנחה מומצאים</span>
          <Link href="/disclosure">
            האתר משתמש בקישורי שותפים <ArrowUpLeft size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <header className="bl-header">
        <div className="bl-wrap bl-header-row">
          <Brand />
          <form action="/search" className="bl-search" role="search">
            <Search size={18} aria-hidden="true" className="bl-search-icon" />
            <input name="q" maxLength={80} placeholder="מותג, דגם או מוצר: למשל Soundcore, 70mai" aria-label="חיפוש מותגים ומוצרים" />
            <button type="submit" aria-label="חיפוש">
              חיפוש
            </button>
          </form>
          <nav className="bl-nav" aria-label="ניווט ראשי">
            <Link href="/brands">מותגים</Link>
            <Link href="/deals">מוצרי מותגים</Link>
            <Link href="/categories">קטגוריות</Link>
            <Link href="/guides">מדריכים</Link>
          </nav>
          <details className="dp-mobile-menu bl-menu">
            <summary aria-label="פתיחת תפריט">
              <Menu aria-hidden="true" />
            </summary>
            <nav aria-label="ניווט נייד">
              <Link href="/brands">מותגים</Link>
              <Link href="/deals">מוצרי מותגים</Link>
              <Link href="/categories">כל הקטגוריות</Link>
              <Link href="/guides">מדריכים</Link>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="bl-footer">
        <div className="bl-wrap">
          <div className="bl-footer-top">
            <div className="bl-footer-brand">
              <Brand light />
              <p>{BRAND.tagline}. מוצרי מותגים מוכרים מ־AliExpress, עם מחיר שנבדק, עלות יבוא משוערת וקישור שנבדק.</p>
            </div>
            <div>
              <strong>לגלות</strong>
              <Link href="/brands">מותגים</Link>
              <Link href="/deals">מוצרי מותגים</Link>
              <Link href="/categories">קטגוריות</Link>
              <Link href="/guides">מדריכי קנייה</Link>
            </div>
            <div>
              <strong>טוב לדעת</strong>
              <Link href="/about">אודות {BRAND.name}</Link>
              <Link href="/disclosure">גילוי שותפים</Link>
              <Link href="/privacy">פרטיות</Link>
              <Link href="/terms">תנאי שימוש</Link>
            </div>
            <div className="bl-footer-note">
              <strong>השורה התחתונה על השקיפות</strong>
              <p>ייתכן שנקבל עמלה מקישורים באתר, בלי עלות נוספת לכם. המחיר, המשלוח והתשלום נקבעים ב־AliExpress.</p>
            </div>
          </div>
          <div className="bl-footer-bottom">
            <span>© {new Date().getFullYear()} {BRAND.name}</span>
            <span>אתר ישראלי עצמאי. איננו קשורים ל־AliExpress או למותגים המוצגים.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const icons: Record<string, typeof House> = { home: House, tech: Headphones, car: Car, sport: Dumbbell };

/** Category tiles for categories that hold verified products. */
export function CategoryLinks({ live }: { live: Set<string> }) {
  return (
    <div className="bl-cats">
      {categories.filter((c) => live.has(c.slug)).map((c) => {
        const Icon = icons[c.slug] ?? House;
        return (
          <Link className="bl-cat" href={"/categories/" + c.slug} key={c.slug}>
            <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
            <strong>{c.label}</strong>
            <p>{c.description}</p>
            <span className="bl-cat-go">
              למוצרים <ArrowUpLeft size={15} aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
