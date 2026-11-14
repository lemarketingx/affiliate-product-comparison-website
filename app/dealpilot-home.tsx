import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Compass,
  Layers3,
  ShieldCheck,
  Search,
} from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { PublicShell, CategoryLinks } from "./public-shell";
import { ProductCard } from "./product-card";
import LiveCatalog from "./live-catalog";
export default function DealPilotHome({
  snapshot,
}: {
  snapshot: CatalogSnapshot;
}) {
  const images = snapshot.items.filter((p) => p.image).slice(0, 3);
  return (
    <PublicShell>
      <main id="main">
        <section className="dp-hero dp-container">
          <div className="dp-hero-copy">
            <span className="dp-eyebrow">
              <span /> קצת סקרנות. הרבה שימושיות.
            </span>
            <h1>
              מגלים מוצרים חכמים.
              <br />
              <em>מוצאים דילים טובים.</em>
            </h1>
            <p>
              מוצרים שימושיים, גאדג׳טים והפתעות שוות מ־AliExpress, במקום אחד.
              בשביל הבית, בשביל היום־יום, ובשבילכם.
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
            <span className="dp-art-label">THE EVERYDAY EDIT / 01</span>
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
                aria-label="איור מקורי של מצפן גילוי"
              >
                <div className="dp-compass-ring">
                  <Compass size={130} strokeWidth={1} />
                </div>
                <span className="dp-art-chip chip-a">
                  <Search size={21} /> לגלות משהו חדש
                </span>
                <span className="dp-art-chip chip-b">
                  <Layers3 size={21} /> למצוא מקום ביום־יום
                </span>
              </div>
            )}
            <div className="dp-art-bottom">
              <span>
                פחות לחפש.
                <br />
                <strong>יותר לגלות.</strong>
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
              <Compass /> מוצרים מהמקור
            </span>
            <span>
              <Layers3 /> קטגוריות לחיים עצמם
            </span>
            <span>
              <ShieldCheck /> קישורים עם גילוי נאות
            </span>
          </div>
        </div>
        <section className="dp-section dp-container">
          <div className="dp-section-head">
            <div>
              <span className="dp-eyebrow">FIND YOUR EVERYDAY</span>
              <h2>כל יום, משהו שימושי.</h2>
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
            <span className="dp-eyebrow">A LITTLE KNOW-HOW</span>
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
