"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PackageSearch, ArrowUpLeft, BadgeCheck } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { brands } from "../lib/dealpilot/brands";
import { ProductCard } from "./product-card";

export default function LiveCatalog({
  snapshot,
  compact = false,
  initialQuery = "",
  initialCategory = "",
  hideTabs = false,
  title,
}: {
  snapshot: CatalogSnapshot;
  compact?: boolean;
  initialQuery?: string;
  initialCategory?: string;
  hideTabs?: boolean;
  title?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [brand, setBrand] = useState(initialCategory),
    [sort, setSort] = useState("source");
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const rows = snapshot.items.filter(
      (p) =>
        (!brand || p.categorySlug === brand) &&
        (!q ||
          p.title.toLocaleLowerCase().includes(q) ||
          p.category.toLocaleLowerCase().includes(q) ||
          (brands.find((b) => b.slug === p.categorySlug)?.he ?? "").includes(q)),
    );
    if (sort === "orders")
      rows.sort((a, b) => (b.orders ?? -1) - (a.orders ?? -1));
    if (sort === "price")
      rows.sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity));
    return compact ? rows.slice(0, 8) : rows;
  }, [snapshot.items, query, brand, sort, compact]);
  const current = brands.find((b) => b.slug === brand);
  return (
    <section className="og-section og-wrap og-catalog" id="products">
      <div className="og-section-head">
        <div>
          <span className="og-kicker">מהחנויות הרשמיות</span>
          <h2>
            {title ??
              (current
                ? "כל המוצרים של " + current.he
                : compact
                  ? "מה קונים עכשיו מהמותגים."
                  : "כל המוצרים, מכל המותגים.")}
          </h2>
          <p>
            {snapshot.available
              ? "מחירי ספק בשקלים מ־AliExpress. המחיר והזמינות עשויים להשתנות."
              : "הקטלוג אינו זמין כרגע. נסו שוב מאוחר יותר."}
          </p>
        </div>
        {compact && (
          <Link className="og-link" href="/deals">
            לכל המוצרים <ArrowUpLeft size={17} />
          </Link>
        )}
      </div>
      <div className="dp-selection-policy og-notice">
        <BadgeCheck size={18} aria-hidden="true" />
        <div>
          <strong>רק מחנויות שמזוהות כרשמיות · בדיקת האיכות טרם הושלמה</strong>
          <p>
            מוצג מוצר רק כשהחנות שלו נושאת את שם המותג ו־Official Store. דירוג
            4.7 ומעלה, ביקורות מישראל ומשלוח לישראל טרם אומתו.
          </p>
          <small>
            יש לבדוק דירוג, ביקורות, אחריות ותנאי משלוח בעמוד המוצר ב־AliExpress
            לפני רכישה.
          </small>
        </div>
      </div>
      <div className="og-filters">
        {!hideTabs && (
          <div className="og-tabs">
            <button onClick={() => setBrand("")} aria-pressed={!brand}>
              הכול
            </button>
            {brands.map((b) => (
              <button
                key={b.slug}
                onClick={() => setBrand(b.slug)}
                aria-pressed={brand === b.slug}
              >
                {b.he}
              </button>
            ))}
          </div>
        )}
        <div className="og-filter-inputs">
          <label className="og-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
              placeholder="סינון לפי מוצר"
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
            <option value="price">מחיר: מהנמוך</option>
          </select>
        </div>
      </div>
      <p className="og-status-line" role="status">
        {snapshot.available
          ? filtered.length + " מוצרים בתצוגה"
          : "ממתינים לחיבור הקטלוג"}
        {snapshot.partial ? " · חלק מהמותגים אינם זמינים כרגע" : ""}
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
        <div className="og-grid">
          {filtered.map((item) => (
            <ProductCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="og-empty">
          <span>
            <PackageSearch size={32} />
          </span>
          <h3>
            {snapshot.available
              ? "לא נמצאו מוצרים בסינון הזה"
              : "קצת סבלנות, הגילוי בדרך."}
          </h3>
          <p>
            {snapshot.available
              ? "נסו מילה אחרת או בחרו מותג אחר."
              : "אין כרגע נתוני מוצרים להצגה. בינתיים אפשר לקרוא על אחריות ויבוא אישי."}
          </p>
          {!snapshot.available && (
            <Link className="og-link" href="/warranty">
              אחריות ויבוא אישי <ArrowUpLeft size={17} />
            </Link>
          )}
        </div>
      )}
      <p className="og-fine">
        קישורי שותפים עשויים לזכות אותנו בעמלה. איננו מוכרים את המוצרים ואיננו
        קשורים למותגים; המחיר הסופי, תנאי המשלוח והאחריות נקבעים ב־AliExpress.{" "}
        <Link href="/disclosure">לגילוי המלא</Link>
      </p>
    </section>
  );
}
