import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, ShieldCheck, Tags, Search, Calculator, ArrowLeft } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { BRANDS, identifyListedBrand } from "../lib/dealpilot/brands";
import { categories } from "../lib/dealpilot/categories";
import type { Banner, CampaignRecord } from "../lib/aliexpress/banners";
import { PublicShell } from "./public-shell";
import { ProductCard } from "./product-card";

export default function DealPilotHome({ snapshot, usdRate = null }: {
  snapshot: CatalogSnapshot;
  banners?: { banners: Banner[]; campaigns: CampaignRecord[]; attributionConfirmed: boolean };
  usdRate?: import("../lib/preflight/tax-estimate").UsdRate | null;
}) {
  const brandCounts = new Map<string, number>();
  for (const item of snapshot.items) {
    const b = identifyListedBrand(item);
    if (b) brandCounts.set(b.slug, (brandCounts.get(b.slug) ?? 0) + 1);
  }
  const available = BRANDS.filter(b => (brandCounts.get(b.slug) ?? 0) > 0);
  const featured = [...snapshot.items].sort((a,b) => (b.orders ?? 0) - (a.orders ?? 0)).slice(0,8);
  return <PublicShell><main id="main">
    <section className="fp-brand-hero">
      <div className="fp-wrap fp-brand-hero-grid">
        <div className="fp-brand-hero-copy">
          <span className="fp-brand-hero-label"><BadgeCheck size={17} aria-hidden="true" /> מותגים מוכרים. קנייה מחושבת.</span>
          <h1>המותגים שאתם מכירים.<span>המחירים שכדאי לבדוק.</span></h1>
          <p>מותגי אלקטרוניקה, אודיו, בית ורכב ב־AliExpress. בלי מוצרים אנונימיים, בלי הנחות מומצאות. עם מחירים בשקלים, מחשבון מיסוי ובדיקות לפני הקנייה.</p>
          <div className="fp-brand-hero-ctas">
            <Link className="fp-btn" href="/brands">גלו מותגים <ArrowUpLeft size={19} aria-hidden="true" /></Link>
            <Link className="fp-btn fp-btn-ghost" href="/deals">לכל מוצרי המותג <ArrowLeft size={19} aria-hidden="true" /></Link>
          </div>
          <p className="fp-brand-hero-disclosure"><ShieldCheck size={16} aria-hidden="true"/> זיהוי המותג מבוסס על נתוני הספק, ואינו אישור למקוריות המוצר או לרשמיות החנות.</p>
        </div>
        <div className="fp-brand-hero-board">
          <span className="fp-brand-board-top"><Tags size={18} /> מותגים שעברו הצלבת מידע</span>
          <div className="fp-brand-hero-big">{available.length.toLocaleString("he-IL")}<small>מותגים עם מוצרים כרגע</small></div>
          <div className="fp-brand-hero-pills">
            {available.slice(0,8).map(b => <Link href={"/brands/"+b.slug} key={b.slug} dir="ltr">{b.name}</Link>)}
          </div>
          <div className="fp-brand-board-bottom">{snapshot.warming ? "הקטלוג מתרענן כרגע" : snapshot.items.length.toLocaleString("he-IL")+" מוצרים מזוהים"} · ללא הבטחה לחנות רשמית</div>
        </div>
      </div>
    </section>
    <section className="fp-wrap fp-brand-discovery" aria-labelledby="brand-discovery-title">
      <div className="fp-section-head"><div><span className="fp-kicker">המבחר שלנו</span><h2 id="brand-discovery-title">בוחרים מותג, לא הימור.</h2><p>המותגים שמוצגים כאן כוללים כרגע מוצרים בקטלוג שעברו סינון.</p></div><Link href="/brands" className="fp-link">לכל המותגים <ArrowUpLeft size={17}/></Link></div>
      {available.length ? <div className="fp-brand-grid">{available.slice(0,12).map(b=><Link className="fp-brand-card" href={"/brands/"+b.slug} key={b.slug}><span className="fp-brand-card-label">מותג מזוהה</span><strong dir="ltr">{b.name}</strong><span>{brandCounts.get(b.slug)} מוצרים</span><span className="fp-brand-card-arrow">לצפייה <ArrowUpLeft size={16}/></span></Link>)}</div>
      : <div className="fp-empty"><h3>הקטלוג הממותג נמצא בבדיקה</h3><p>כאן יופיעו מותגים עם מוצרים שעברו הצלבת נתוני ספק. מוצרים לא מאומתים לא יפורסמו.</p></div>}
    </section>
    <section className="fp-brand-benefits"><div className="fp-wrap fp-brand-benefit-grid">
      <div><BadgeCheck size={24}/><strong>מותגים שמכירים</strong><p>רשימה מוגדרת מראש, לא מוצרים אקראיים.</p></div>
      <div><Calculator size={24}/><strong>מחשבון עלות לישראל</strong><p>משלוח, מע״מ ועלויות מוכרות לפני תשלום.</p></div>
      <div><ShieldCheck size={24}/><strong>בדיקה לפני קנייה</strong><p>מקוריות, מוכר, מפרט ומשלוח דורשים אימות.</p></div>
    </div></section>
    <section className="fp-wrap fp-section" id="products">
      <div className="fp-section-head"><div><span className="fp-kicker">מהקטלוג הממותג</span><h2>מוצרים נבחרים של מותגים מוכרים.</h2><p>לפי המכירות המדווחות של הספק, לא לפי הבטחת מקוריות או דירוג איכות.</p></div><Link href="/deals" className="fp-link">לכל המוצרים <ArrowUpLeft size={17}/></Link></div>
      {featured.length ? <div className="fp-grid">{featured.map(p=><ProductCard key={p.id} item={p} usdRate={usdRate}/>)}</div> : <div className="fp-empty"><Search size={35}/><h3>ממתינים למוצרי מותג שעברו בדיקה</h3><p>אנחנו לא מפרסמים מוצרים גנריים במקום פריטים שחסר להם אימות.</p></div>}
    </section>
    <section className="fp-wrap fp-brand-last"><div><span className="fp-kicker">קנייה חכמה</span><h2>מחיר נמוך אינו כל הסיפור.</h2><p>כל דף מוצר כולל מחשבון עלות רכישה והערות על מה שעדיין צריך לבדוק אצל המוכר. קישורי שותפים עשויים להניב עמלה.</p><Link className="fp-btn" href="/deals">בדיקת מוצרים <ArrowUpLeft size={16}/></Link></div><div className="fp-brand-last-numbers"><strong>{categories.length}</strong><span>תחומים נבחרים</span><strong>{BRANDS.length}</strong><span>מותגים ברשימת המחקר</span></div></section>
  </main></PublicShell>;
}
