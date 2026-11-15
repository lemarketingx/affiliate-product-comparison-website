import Link from "next/link";
import { Search, Menu, ChevronDown, Flame, House, LayoutGrid, Tags, Heart } from "lucide-react";
import { brands } from "../lib/dealpilot/brands";
import { shelves } from "../lib/dealpilot/shelves";
import { FavCount } from "./favorites";
import { BrandMark } from "./brand-mark";

export function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <Link href="/" className={"og-logo" + (light ? " is-light" : "")} aria-label="DealPilot בית">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M3 16.5 31 4l-9.5 27-5.2-10.6z" fill="#ff7a1a" />
        <path d="M16.3 20.4 31 4 12.4 17.4z" fill="#ffc98a" />
      </svg>
      <span dir="ltr">
        Deal<b>Pilot</b>
      </span>
    </Link>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="og">
      <a className="og-skip" href="#main">
        דילוג לתוכן
      </a>
      <header className="og-header">
        <div className="og-wrap og-header-row">
          <Wordmark />
          <nav className="og-nav" aria-label="ניווט ראשי">
            <Link href="/">דף הבית</Link>
            <Link href="/brands">מותגים</Link>
            <details className="og-mega">
              <summary>
                קטגוריות <ChevronDown size={15} />
              </summary>
              <div className="og-mega-panel">
                <div>
                  <strong>קטגוריות</strong>
                  {shelves.map((s) => (
                    <Link key={s.slug} href={"/categories/" + s.slug}>
                      {s.label}
                    </Link>
                  ))}
                </div>
                <div>
                  <strong>מותגים</strong>
                  {brands.map((b) => (
                    <Link key={b.slug} href={"/brands/" + b.slug} dir="ltr">
                      {b.name}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
            <Link href="/deals?sort=discount">מבצעים חמים</Link>
            <Link href="/warranty">אחריות ויבוא</Link>
          </nav>
          <form action="/search" className="og-search" role="search">
            <input
              name="q"
              maxLength={80}
              placeholder="חיפוש מותג, מוצר או קטגוריה…"
              aria-label="חיפוש מוצרים"
            />
            <button type="submit" aria-label="חיפוש">
              <Search size={18} />
            </button>
          </form>
          <div className="og-header-actions">
            <FavCount />
            <Link className="og-btn og-btn-go og-btn-sm" href="/deals?sort=discount">
              <Flame size={17} /> למבצעים
            </Link>
          </div>
          <details className="dp-mobile-menu og-menu">
            <summary aria-label="פתיחת תפריט">
              <Menu />
            </summary>
            <nav aria-label="ניווט נייד">
              <Link href="/brands">מותגים</Link>
              <Link href="/deals">כל המוצרים</Link>
              <Link href="/categories">קטגוריות</Link>
              <Link href="/deals?sort=discount">מבצעים חמים</Link>
              <Link href="/warranty">אחריות ויבוא</Link>
              <Link href="/saved">המועדפים שלי</Link>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="og-footer">
        <div className="og-wrap">
          <div className="og-footer-top">
            <div className="og-footer-brand">
              <Wordmark />
              <p>
                המותגים שאתם מכירים, מהחנויות הרשמיות שלהם ב־AliExpress. אתר גילוי
                עצמאי בעברית.
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
              <strong>קטגוריות</strong>
              {shelves.slice(0, 6).map((s) => (
                <Link key={s.slug} href={"/categories/" + s.slug}>
                  {s.label}
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
          </div>
          <p className="og-footer-note">
            ייתכן שנקבל עמלה מקישורים באתר, בלי עלות נוספת לכם. DealPilot אינו קשור
            למותגים או ל־AliExpress ואינו מוכר את המוצרים. שמות המותגים שייכים לבעליהם.
          </p>
          <div className="og-footer-bottom">
            <span>© {new Date().getFullYear()} DealPilot</span>
            <span>המחיר, המשלוח והאחריות נקבעים ב־AliExpress ואצל המוכר.</span>
          </div>
        </div>
      </footer>
      <nav className="og-tabbar" aria-label="ניווט מהיר">
        <Link href="/">
          <House size={20} />
          בית
        </Link>
        <Link href="/brands">
          <Tags size={20} />
          מותגים
        </Link>
        <Link href="/categories">
          <LayoutGrid size={20} />
          קטגוריות
        </Link>
        <Link href="/deals?sort=discount">
          <Flame size={20} />
          מבצעים
        </Link>
        <Link href="/saved">
          <Heart size={20} />
          מועדפים
        </Link>
      </nav>
    </div>
  );
}

export function BrandDirectory({ counts }: { counts?: Record<string, number> }) {
  return (
    <ul className="og-brandwall og-brandwall-lg">
      {brands.map((b) => (
        <li key={b.slug}>
          <Link href={"/brands/" + b.slug} style={{ "--accent": b.accent } as React.CSSProperties}>
            <BrandMark slug={b.slug} className="og-bw-name" />
            <span className="og-bw-he">{b.he}</span>
            <span className="og-bw-known">{b.knownFor}</span>
            <span className="og-bw-meta">
              {counts && counts[b.slug] ? counts[b.slug] + " מוצרים" : "לחנות המותג"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryLinks() {
  return <BrandDirectory />;
}

/* Used by the admin login page. */
export function Brand() {
  return <Wordmark light={false} />;
}
