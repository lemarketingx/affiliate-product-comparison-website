import "./lab.css";
import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getCatalog, type CatalogItem } from "../../../../lib/aliexpress/catalog";
import { formatMoney } from "../../../../lib/dealpilot/urls";
import { identifyListedBrand } from "../../../../lib/dealpilot/brands";
import { BRAND } from "../../../../lib/brand";

// Admin-only comparison of three design directions on the SAME slice, with
// real catalog rows. Temporary: remove before merging the chosen direction.
export const dynamic = "force-dynamic";

const ago = (iso: string | null | undefined) => {
  if (!iso) return "זמן בדיקה לא ידוע";
  const h = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));
  return h < 1 ? "נבדק בשעה האחרונה" : `נבדק לפני ${h} שעות`;
};
const Img = ({ item, className }: { item: CatalogItem; className: string }) =>
  item.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={item.image.replace(/\.(jpg|png|webp)$/i, ".$1_350x350.$1")} alt="" loading="lazy" />
  ) : (
    <div className={className} aria-hidden="true" />
  );

function Symbol({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "#FAFAF7" : "#121417", fg = dark ? "#121417" : "#FAFAF7";
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill={bg} />
      <path d="M24 13h24a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H24L11 26z" fill={fg} />
      <circle cx="22" cy="26" r="3.6" fill={bg} />
      <path d="M29 26.5l4 4 8-9" fill="none" stroke={bg} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="46" width="40" height="6.5" rx="3.25" fill="#FFD43B" />
    </svg>
  );
}

/* A — "השורה התחתונה": receipt logic, ink on paper, one highlighter accent. */
function DirectionA({ items }: { items: CatalogItem[] }) {
  const p = items[0];
  return (
    <section className="lab-a" aria-label="כיוון A">
      <header className="lab-a-head">
        <span className="lab-a-brand"><Symbol /> <b>{BRAND.name}</b></span>
        <form className="lab-a-search" role="search"><input aria-label="חיפוש A" placeholder="מה מחפשים? למשל: אוזניות Soundcore עד 200 ₪" /><button type="button">חיפוש</button></form>
      </header>
      <div className="lab-a-hero">
        <h2>המחיר האמיתי. <mark>בשורה התחתונה.</mark></h2>
        <p>מוצרי מותגים מ־AliExpress, עם מחיר שנבדק מחדש כל יום, קישור שנבדק שמגיע למוצר הנכון, ובלי אחוזי הנחה מומצאים.</p>
      </div>
      <div className="lab-a-grid">
        {items.slice(0, 2).map((it) => (
          <article key={it.id} className="lab-a-card">
            <Img item={it} className="lab-a-img" />
            <span className="lab-a-brandtag">{identifyListedBrand(it)?.name ?? "מותג"}</span>
            <h3 dir="auto">{it.title}</h3>
            <div className="lab-a-line"><span>מחיר ב־AliExpress</span><b dir="ltr">{formatMoney(it.price, it.currency)}</b></div>
            <small>{ago(it.priceObservedAt)} · {it.orders?.toLocaleString("he-IL") ?? "?"} מכירות מדווחות</small>
          </article>
        ))}
      </div>
      {p && (
        <div className="lab-a-receipt" aria-label="פירוט מחיר A">
          <div className="lab-a-row"><span>מחיר המוצר</span><b dir="ltr">{formatMoney(p.price, p.currency)}</b></div>
          <div className="lab-a-row"><span>משלוח לישראל</span><span className="lab-muted">נבדק בקופה</span></div>
          <div className="lab-a-row"><span>מע״מ ביבוא</span><span className="lab-muted">לפי מחשבון</span></div>
          <div className="lab-a-row lab-a-total"><span>שורה תחתונה (אומדן)</span><b dir="ltr">{formatMoney(p.price, p.currency)}+</b></div>
          <a className="lab-a-cta" href="#">לבדיקה ב־AliExpress ←</a>
          <small>{ago(p.priceObservedAt)} · קישור שותפים · קישור נבדק שמוביל לאותו מוצר</small>
        </div>
      )}
    </section>
  );
}

/* B — "שוק": editorial, image-first, warm. */
function DirectionB({ items }: { items: CatalogItem[] }) {
  const p = items[0];
  return (
    <section className="lab-b" aria-label="כיוון B">
      <header className="lab-b-head">
        <span className="lab-b-brand"><Symbol /> <b>{BRAND.name}</b></span>
        <input className="lab-b-search" aria-label="חיפוש B" placeholder="חיפוש מותג או מוצר" />
      </header>
      <div className="lab-b-hero">
        <span className="lab-b-kicker">השבוע במותגים</span>
        <h2>דברים טובים, במחיר שבדקנו.</h2>
      </div>
      <div className="lab-b-grid">
        {items.slice(0, 2).map((it) => (
          <article key={it.id} className="lab-b-card">
            <Img item={it} className="lab-b-img" />
            <div className="lab-b-body">
              <h3 dir="auto">{it.title}</h3>
              <b dir="ltr">{formatMoney(it.price, it.currency)}</b>
            </div>
          </article>
        ))}
      </div>
      {p && (
        <div className="lab-b-buy">
          <b dir="ltr">{formatMoney(p.price, p.currency)}</b>
          <a href="#">לרכישה ב־AliExpress</a>
          <small>{ago(p.priceObservedAt)}</small>
        </div>
      )}
    </section>
  );
}

/* C — "לוח מחוונים": dark, data-dense intelligence. */
function DirectionC({ items, total, fresh }: { items: CatalogItem[]; total: number; fresh: number }) {
  const p = items[0];
  return (
    <section className="lab-c" aria-label="כיוון C">
      <header className="lab-c-head">
        <span className="lab-c-brand"><Symbol dark /> <b>{BRAND.name}</b></span>
        <input className="lab-c-search" aria-label="חיפוש C" placeholder="⌕ חיפוש · מותג · דגם" />
      </header>
      <div className="lab-c-hero">
        <h2>מודיעין קניות. מחירים, קישורים ובדיקות, כל יום.</h2>
        <div className="lab-c-kpis"><span><b>{total}</b> מוצרים מפורסמים</span><span><b>{fresh}</b> מחירים עדכניים (עד 48 שעות)</span></div>
      </div>
      <div className="lab-c-grid">
        {items.slice(0, 2).map((it) => (
          <article key={it.id} className="lab-c-card">
            <Img item={it} className="lab-c-img" />
            <h3 dir="auto">{it.title}</h3>
            <div className="lab-c-chips"><span>{identifyListedBrand(it)?.name ?? "מותג"}</span><span>{it.orders?.toLocaleString("he-IL")} מכירות</span></div>
            <b dir="ltr">{formatMoney(it.price, it.currency)}</b>
            <small className="lab-c-hist">היסטוריית מחיר: נאספת (פחות מ־30 יום)</small>
          </article>
        ))}
      </div>
      {p && (
        <div className="lab-c-buy"><b dir="ltr">{formatMoney(p.price, p.currency)}</b><a href="#">פתיחה ב־AliExpress</a><small>{ago(p.priceObservedAt)}</small></div>
      )}
    </section>
  );
}

export default async function DesignLab() {
  await requireAdmin();
  const snap = await getCatalog();
  const items = snap.items.slice(0, 4);
  return (
    <div className="lab">
      <h1>מעבדת עיצוב: שלושה כיוונים על אותו קטע</h1>
      <p className="lab-note">דף זמני, לבעלים בלבד. נתונים אמיתיים מהקטלוג. שם המותג מגיע מ־lib/brand.ts וניתן להחלפה.</p>
      {items.length ? (
        <>
          <DirectionA items={items} />
          <DirectionB items={items} />
          <DirectionC items={items} total={snap.items.length} fresh={snap.items.filter((i) => i.priceStatus === "current").length} />
        </>
      ) : (
        <p>הקטלוג ריק כרגע.</p>
      )}
    </div>
  );
}
