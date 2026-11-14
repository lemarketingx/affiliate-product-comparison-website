"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PackageSearch, ArrowUpLeft } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { categories } from "../lib/dealpilot/categories";
import { ProductCard } from "./product-card";
export default function LiveCatalog({
  snapshot,
  compact = false,
  initialQuery = "",
  initialCategory = "",
}: {
  snapshot: CatalogSnapshot;
  compact?: boolean;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [category, setCategory] = useState(initialCategory),
    [sort, setSort] = useState("source");
  const filtered = useMemo(() => {
    const rows = snapshot.items.filter(
      (p) =>
        (!category || p.categorySlug === category) &&
        p.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    );
    if (sort === "orders")
      rows.sort((a, b) => (b.orders ?? -1) - (a.orders ?? -1));
    return compact ? rows.slice(0, 8) : rows;
  }, [snapshot.items, query, category, sort, compact]);
  return (
    <section className="dp-section dp-container" id="products">
      <div className="dp-section-head">
        <div>
          <span className="dp-eyebrow">מקום לסקרנות שלכם</span>
          <h2>
            {initialCategory
              ? categories.find((c) => c.slug === initialCategory)?.label
              : compact
                ? "אולי זה בדיוק מה שחיפשתם."
                : "בואו למצוא משהו בשבילכם."}
          </h2>
          <p>
            {snapshot.available
              ? "מוצרים מ־AliExpress במחירי ספק בשקלים. המחירים והזמינות עשויים להשתנות."
              : "הקטלוג אינו זמין כרגע. נסו שוב מאוחר יותר."}
          </p>
        </div>
        {compact && (
          <Link className="dp-text-link" href="/deals">
            לכל המוצרים <ArrowUpLeft size={18} />
          </Link>
        )}
      </div>
      {snapshot.qualityFiltered && (
        <div className="dp-selection-policy">
          <strong>מוצרים שעוברים את הבדיקה שלנו</strong>
          <p>
            יותר מ־500 רכישות מדווחות · דירוג 4.7 ומעלה · ביקורת מישראל · משלוח
            מאומת לישראל
          </p>
          <small>כל התנאים נבדקים בנפרד. מידע חסר אינו נחשב לאישור.</small>
        </div>
      )}
      {!snapshot.qualityFiltered && (
        <div className="dp-selection-policy">
          <strong>מוצרים לגילוי · בדיקת האיכות טרם הושלמה</strong>
          <p>מוצגים מוצרים עם יותר מ־500 רכישות מדווחות. דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו.</p>
          <small>יש לבדוק דירוג, ביקורות ותנאי משלוח בעמוד המוצר ב־AliExpress לפני רכישה.</small>
        </div>
      )}
      <div className="dp-filter-row">
        <div className="dp-filter-tabs">
          <button onClick={() => setCategory("")} aria-pressed={!category}>
            הכול
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              aria-pressed={category === c.slug}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="dp-filter-inputs">
          <label className="dp-search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
              placeholder="חיפוש בקטלוג"
              aria-label="סינון לפי שם מוצר"
            />
          </label>
          <select
            aria-label="סדר מוצרים"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="source">סדר הספק</option>
            <option value="orders">הזמנות לפי הספק</option>
          </select>
        </div>
      </div>
      <p className="dp-catalog-status" role="status">
        {snapshot.available
          ? filtered.length + " מוצרים בתצוגה"
          : "ממתינים לחיבור הקטלוג"}
        {snapshot.partial ? " · חלק מהקטגוריות אינן זמינות" : ""}
        {snapshot.fetchedAt
          ? " · נתוני ספק מ־" +
            new Intl.DateTimeFormat("he-IL", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Asia/Jerusalem",
            }).format(new Date(snapshot.fetchedAt))
          : ""}
      </p>
      {filtered.length ? (
        <div className="dp-product-grid">
          {filtered.map((item) => (
            <ProductCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="dp-empty">
          <span>
            <PackageSearch size={34} />
          </span>
          <h3>
            {snapshot.available &&
            snapshot.qualityFiltered &&
            snapshot.items.length === 0
              ? "המוצרים הבאים שלנו עדיין בבדיקה"
              : snapshot.available
                ? "לא נמצאו מוצרים בסינון הזה"
                : "קצת סבלנות, הגילוי בדרך."}
          </h3>
          <p>
            {snapshot.available &&
            snapshot.qualityFiltered &&
            snapshot.items.length === 0
              ? "נציג כאן רק מוצרים שעברו את כל התנאים: רכישות, דירוג, ביקורת ישראלית ומשלוח לישראל. אפשר לחזור בהמשך."
              : snapshot.available
                ? "נסו שם אחר או בחרו קטגוריה נוספת."
                : "אין כרגע נתוני מוצרים להצגה. בינתיים אפשר לעיין במדריך הקנייה."}
          </p>
          {!snapshot.available && (
            <Link className="dp-text-link" href="/guides">
              איך קונים חכם <ArrowUpLeft size={17} />
            </Link>
          )}
        </div>
      )}
      <p className="dp-disclosure">
        קישורי שותפים עשויים לזכות אותנו בעמלה. איננו מוכרים את המוצרים; המחיר
        הסופי, תנאי המשלוח והזמינות נקבעים ב־AliExpress.{" "}
        <Link href="/disclosure">לגילוי המלא</Link>
      </p>
    </section>
  );
}
