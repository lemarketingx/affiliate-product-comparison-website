import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Compass,
  Layers3,
  ShieldCheck,
  Sparkles,
  Headphones,
  Coffee,
  LampDesk,
} from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { PublicShell, CategoryLinks } from "./public-shell";
import LiveCatalog from "./live-catalog";
export default function DealPilotHome({
  snapshot,
}: {
  snapshot: CatalogSnapshot;
}) {
  const seenCategories = new Set<string>();
  const images = snapshot.items
    .filter((p) => {
      if (!p.image || seenCategories.has(p.categorySlug)) return false;
      seenCategories.add(p.categorySlug);
      return true;
    })
    .slice(0, 3);
  return (
    <PublicShell>
      <main id="main">
        <section className="dp-hero dp-container">
          <div className="dp-hero-copy">
            <span className="dp-eyebrow">
              <Sparkles size={16} /> איזה כיף לגלות משהו חדש
            </span>
            <h1>
              מגלים מוצרים חכמים.
              <br />
              <em>מוצאים דילים טובים.</em>
            </h1>
            <p>
              משהו קטן לבית, רעיון לשולחן העבודה, או גאדג׳ט שפשוט כיף להכיר.
              בואו למצוא את הדברים שמתאימים ליום־יום שלכם.
            </p>
            <div className="dp-actions">
              <Link className="dp-btn" href="/deals">
                גלו מוצרים <ArrowLeft size={19} />
              </Link>
              <Link className="dp-text-link" href="/categories">
                כל הקטגוריות <ArrowUpLeft size={18} />
              </Link>
            </div>
            <div className="dp-hero-caption">
              <ShieldCheck size={17} /> מידע מהספק · המחיר הסופי ב־AliExpress
            </div>
          </div>
          <div className="dp-hero-visual">
            <div className="dp-visual-grid" />
            <span className="dp-art-label">
              <Sparkles size={15} /> קצת השראה ליום־יום
            </span>
            {images.length ? (
              <div className="dp-hero-products">
                {images.map((p, i) => (
                  <Link
                    href={"/products/" + p.id}
                    className={"dp-hero-product hp-" + i}
                    key={p.id}
                  >
                    <img src={p.image!} alt={p.title} />
                    <span>
                      {p.category} <ArrowUpLeft size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="dp-original-art"
                aria-label="איור של אוזניות, כוס ומנורה להשראה יומיומית"
              >
                <div className="dp-illustration-tile illustration-main">
                  <Headphones size={91} strokeWidth={1.2} />
                  <span>רגע לעצמכם</span>
                </div>
                <div className="dp-illustration-tile illustration-coffee">
                  <Coffee size={55} strokeWidth={1.4} />
                  <span>הפינה שלכם</span>
                </div>
                <div className="dp-illustration-tile illustration-lamp">
                  <LampDesk size={63} strokeWidth={1.3} />
                  <span>רעיונות קטנים</span>
                </div>
              </div>
            )}
            <div className="dp-art-bottom">
              <span>
                קצת לבית. קצת לעצמכם.
                <br />
                <strong>הרבה דברים לגלות.</strong>
              </span>
              <span className="dp-art-arrow">
                <ArrowUpLeft size={32} />
              </span>
            </div>
          </div>
        </section>
        <div className="dp-value-strip">
          <div className="dp-container">
            <span>
              <Compass /> מגלים בקצב שלכם
            </span>
            <span>
              <Layers3 /> רעיונות לכל פינה
            </span>
            <span>
              <ShieldCheck /> קישורים עם גילוי נאות
            </span>
          </div>
        </div>
        <section className="dp-section dp-container">
          <div className="dp-section-head">
            <div>
              <span className="dp-eyebrow">מאיפה מתחילים?</span>
              <h2>מה יעשה לכם את היום?</h2>
            </div>
            <Link className="dp-text-link" href="/categories">
              לכל הקטגוריות <ArrowUpLeft size={18} />
            </Link>
          </div>
          <CategoryLinks />
        </section>
        <LiveCatalog snapshot={snapshot} compact />
        <section className="dp-editorial dp-container">
          <div>
            <span className="dp-eyebrow">לפני שמוצאים מקום בבית</span>
            <h2>
              הדיל הטוב מתחיל
              <br />
              בבדיקה קטנה.
            </h2>
            <p>
              לפני שמקליקים: בודקים גרסה, משלוח, מחיר סופי ומדיניות החזרה. הכנו
              מדריך קצר שיעזור לעשות סדר.
            </p>
            <Link className="dp-btn dp-btn-secondary" href="/guides">
              למדריך הקנייה <ArrowLeft size={18} />
            </Link>
          </div>
          <div className="dp-editorial-steps">
            {[
              "משווים את הגרסה המדויקת",
              "בודקים משלוח לישראל",
              "מאמתים מחיר בקופה",
            ].map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                <strong>{s}</strong>
                <ArrowUpLeft size={20} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
