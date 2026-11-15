"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, PackageSearch, ArrowUpLeft, Shuffle, RadioTower } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { categories } from "../lib/dealpilot/categories";
import { ProductCard } from "./product-card";
export default function LiveCatalog({
  snapshot,
  compact = false,
  initialQuery = "",
  initialCategory = "",
  total,
}: {
  snapshot: CatalogSnapshot;
  compact?: boolean;
  initialQuery?: string;
  initialCategory?: string;
  /** Size of the whole published catalog when only a slice is passed in. */
  total?: number;
}) {
  const router = useRouter();
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
    <section className="fp-section fp-wrap fp-catalog" id="products">
      <div className="fp-section-head">
        <div>
          <span className="fp-kicker">לוח הטיסות המלא</span>
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
        <div className="fp-head-actions">
          {snapshot.items.length > 1 && (
            <button
              type="button"
              className="fp-btn fp-btn-ghost fp-btn-sm"
              onClick={() => {
                const pick =
                  snapshot.items[Math.floor(Math.random() * snapshot.items.length)];
                router.push("/products/" + pick.id);
              }}
            >
              <Shuffle size={16} /> טיסה אקראית
            </button>
          )}
          {compact && (
            <Link className="fp-link" href="/deals">
              לכל המוצרים <ArrowUpLeft size={17} />
            </Link>
          )}
        </div>
      </div>
      {snapshot.qualityFiltered && (
        <div className="dp-selection-policy fp-notice">
          <RadioTower size={18} aria-hidden="true" />
          <div>
          <strong>מוצרים שעוברים את הבדיקה שלנו</strong>
          <p>
            יותר מ־500 רכישות מדווחות · דירוג 4.7 ומעלה · ביקורת מישראל · משלוח
            מאומת לישראל
          </p>
          <small>כל התנאים נבדקים בנפרד. מידע חסר אינו נחשב לאישור.</small>
          </div>
        </div>
      )}
      {!snapshot.qualityFiltered && (
        <div className="dp-selection-policy fp-notice">
          <RadioTower size={18} aria-hidden="true" />
          <div>
          <strong>מוצרים לגילוי · בדיקת האיכות טרם הושלמה</strong>
          <p>מוצגים מוצרים עם יותר מ־5,000 מכירות מדווחות וקישור שותפים תקין. דירוג 4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו.</p>
          <small>יש לבדוק דירוג, ביקורות ותנאי משלוח בעמוד המוצר ב־AliExpress לפני רכישה.</small>
          </div>
        </div>
      )}
      <div className="fp-filters">
        <div className="fp-tabs">
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
        <div className="fp-filter-inputs">
          <label className="fp-field">
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
      <p className="fp-status-line" role="status">
        {snapshot.available
          ? total !== undefined
            ? total.toLocaleString("he-IL") + " מוצרים בקטלוג · " + filtered.length + " בתצוגה כאן"
            : filtered.length + " מוצרים בתצוגה"
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
        <div className="fp-grid">
          {filtered.map((item) => (
            <ProductCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="fp-empty">
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
            <Link className="fp-link" href="/guides">
              איך קונים חכם <ArrowUpLeft size={17} />
            </Link>
          )}
        </div>
      )}
      <p className="fp-fine">
        קישורי שותפים עשויים לזכות אותנו בעמלה. איננו מוכרים את המוצרים; המחיר
        הסופי, תנאי המשלוח והזמינות נקבעים ב־AliExpress.{" "}
        <Link href="/disclosure">לגילוי המלא</Link>
      </p>
    </section>
  );
}
