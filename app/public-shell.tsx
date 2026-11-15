import Link from "next/link";
import {
  ArrowUpLeft,
  Search,
  Menu,
  House,
  Headphones,
  Car,
  Boxes,
  ShoppingBag,
  Brush,
  Gamepad2,
  Dumbbell,
  RadioTower,
} from "lucide-react";
import { categories } from "../lib/dealpilot/categories";
import { BrandMark, gateCode } from "./flight-bits";
import FlightClock from "./flight-clock";
import { visibleTypes } from "../lib/preflight";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={"dp-brand fp-brand" + (light ? " fp-brand-light" : "")}
      href="/"
      aria-label="DealPilot בית"
    >
      <BrandMark />
      <span dir="ltr" className="fp-wordmark">
        deal<strong>pilot</strong>
      </span>
    </Link>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const autopilot = visibleTypes().length > 0;
  return (
    <div className="fp">
      <a className="fp-skip" href="#main">
        דילוג לתוכן
      </a>
      <div className="fp-tower">
        <div className="fp-wrap fp-tower-row">
          <span className="fp-tower-label">
            <RadioTower size={14} /> מגדל פיקוח
          </span>
          <span className="fp-tower-msg">
            מגלים ב־DealPilot · קונים ב־AliExpress ·{" "}
            <Link href="/disclosure">
              איך קישורי השותפים שלנו עובדים <ArrowUpLeft size={12} />
            </Link>
          </span>
          <span className="fp-tower-time">
            שעון ישראל <FlightClock />
          </span>
        </div>
      </div>
      <header className="fp-header">
        <div className="fp-wrap fp-header-row">
          <Brand />
          <form action="/search" className="fp-search" role="search">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              maxLength={80}
              placeholder="חיפוש מותג או מוצר ממותג"
              aria-label="חיפוש מותגים ומוצרים"
            />
            <button type="submit" aria-label="חיפוש">
              <ArrowUpLeft size={18} />
            </button>
          </form>
          <nav className="fp-nav" aria-label="ניווט ראשי">
            {autopilot && <Link href="/autopilot">טייס אוטומטי</Link>}
            {autopilot && <Link href="/missions">יעדים</Link>}
            <Link href="/brands">מותגים</Link><Link href="/deals">מוצרי מותגים</Link>
            <Link href="/categories">קטגוריות</Link>
            <Link href="/guides">מדריכים</Link>
          </nav>
          <details className="dp-mobile-menu fp-menu">
            <summary aria-label="פתיחת תפריט">
              <Menu />
            </summary>
            <nav aria-label="ניווט נייד">
              {autopilot && <Link href="/autopilot">טייס אוטומטי</Link>}
              {autopilot && <Link href="/missions">יעדים</Link>}
              <Link href="/brands">מותגים</Link><Link href="/deals">מוצרי מותגים</Link>
              <Link href="/categories">כל הקטגוריות</Link>
              <Link href="/guides">מדריכים</Link>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="fp-footer">
        <div className="fp-wrap">
          <div className="fp-footer-top">
            <div className="fp-footer-brand">
              <Brand light />
              <p>
                מגלים מוצרים חכמים, בודקים לפני שממריאים.
                <br />
                אתר ישראלי למציאת מוצרים של מותגים מוכרים ב־AliExpress.
              </p>
            </div>
            <div>
              <strong>לגלות</strong>
              <Link href="/brands">מותגים</Link><Link href="/deals">מוצרי מותגים</Link>
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
            <div className="fp-footer-pass">
              <span className="fp-pass-kicker">כרטיס גילוי נאות</span>
              <strong>הבחירה נשארת שלכם.</strong>
              <p>
                ייתכן שנקבל עמלה מקישורים באתר. המחיר, המשלוח והתשלום נקבעים
                ב־AliExpress.
              </p>
            </div>
          </div>
          <div className="fp-footer-bottom">
            <span>© {new Date().getFullYear()} DealPilot</span>
            <span>נבנה בשביל הסקרנות שלכם.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const icons = {
  home: House,
  tech: Headphones,
  car: Car,
  organization: Boxes,
  fashion: ShoppingBag,
  beauty: Brush,
  games: Gamepad2,
  sport: Dumbbell,
};

export function CategoryLinks() {
  return (
    <div className="fp-gates">
      {categories.map((c, i) => {
        const Icon = icons[c.slug];
        return (
          <Link className="fp-gate" href={"/categories/" + c.slug} key={c.slug}>
            <span className="fp-gate-top">
              <span className="fp-gate-code" dir="ltr">
                <small>שער</small>
                {gateCode(i)}
              </span>
              <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <strong>{c.label}</strong>
            <p>{c.description}</p>
            <span className="fp-gate-go">
              לעלייה <ArrowUpLeft size={16} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
