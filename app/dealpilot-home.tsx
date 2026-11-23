import { liveCategorySlugs } from "../lib/dealpilot/categories";
import Link from "next/link";
import { ArrowUpLeft, ArrowLeft, BadgeCheck, ShieldCheck, Calculator, Search, Headphones, Camera, Home, PlugZap, Laptop, Sparkles } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { BRANDS, identifyListedBrand } from "../lib/dealpilot/brands";
import type { Banner, CampaignRecord } from "../lib/aliexpress/banners";
import { validAffiliateUrl } from "../lib/aliexpress/catalog-build";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { PublicShell } from "./public-shell";
import BrandLogo from "./brand-logo";
import CampaignCarousel, { type PromoSlide } from "./campaign-carousel";
import { ProductCard } from "./product-card";
import HomeMarquee, { type MarqueeItem } from "./home-marquee";
import { thumbUrl } from "../lib/dealpilot/thumb";
import { BRAND } from "../lib/brand";
import ProductImage from "./product-image";
import { formatMoney } from "../lib/dealpilot/urls";
import { freshnessLabel } from "../lib/catalog-store/price-view";
import { productDisplayTitle } from "../lib/dealpilot/product-titles";
import { productsCount } from "../lib/dealpilot/copy";

function imageOf(p: CatalogItem) { return p.image ?? null; }
function brandOf(p: CatalogItem) { return identifyListedBrand(p); }

const groups = [
  { key: "tech", label: "אביזרי טכנולוגיה", sub: "מטענים, כבלים ומתאמים", icon: Laptop, brands: ["ugreen","baseus","anker","xiaomi"] },
  { key: "home", label: "בית חכם", sub: "בית מחובר ונוח יותר", icon: Home, brands: ["yeelight","reolink","xiaomi"] },
  { key: "car", label: "מצלמות רכב", sub: "מותגים מוכרים לדרך", icon: Camera, brands: ["70mai","viofo","ddpai"] },
  { key: "audio", label: "אוזניות ואודיו", sub: "מותגי סאונד מוכרים", icon: Headphones, brands: ["soundcore","qcy","edifier"] },
  { key: "charging", label: "טעינה חכמה", sub: "פתרונות למחשב ולנייד", icon: PlugZap, brands: ["anker","baseus","ugreen"] },
  { key: "vacuum", label: "שואבים לבית", sub: "מותגים למטלות היומיום", icon: Sparkles, brands: ["dreame","roborock"] },
] as const;

export default function DealPilotHome({ snapshot, banners, usdRate = null }: {
  snapshot: CatalogSnapshot;
  banners?: { banners: Banner[]; campaigns: CampaignRecord[]; attributionConfirmed: boolean };
  usdRate?: import("../lib/preflight/tax-estimate").UsdRate | null;
}) {
  const brandCounts = new Map<string, number>();
  for (const item of snapshot.items) {
    const b = brandOf(item);
    if (b) brandCounts.set(b.slug, (brandCounts.get(b.slug) ?? 0) + 1);
  }
  const available = BRANDS.filter(b => (brandCounts.get(b.slug) ?? 0) > 0);
  const ranked = [...snapshot.items].sort((a,b) => (b.orders ?? 0) - (a.orders ?? 0));
  const featured = ranked.slice(0, 8);
  const imagesFor = (slugs: readonly string[]) =>
    ranked.filter(p => {const b = brandOf(p); return b && slugs.includes(b.slug) && imageOf(p);})
      .slice(0, 3).map(p => p.image!).filter(Boolean);
  const live = liveCategorySlugs(snapshot.items);
  const slides: PromoSlide[] = [];
  const now = Date.now();
  const elevenStart = Date.parse("2026-11-01T00:00:00+02:00");
  const elevenEnd = Date.parse("2026-11-19T00:00:00+02:00");
  if (now >= elevenStart && now < elevenEnd) {
    slides.push({ key: "eleven-2026", eyebrow: "11.11 · פסטיבל הקניות של AliExpress", title: "מותגים שאתם מכירים. החלטות קנייה חכמות.", subtitle: "אירוע 11.11 מתקיים בתקופה זו. בדקו את מחיר המוצר ואת ההטבות בקופה לפני התשלום.", notice: "המוצרים שמוצגים כאן לא בהכרח משתתפים בקמפיין, ואין הבטחה להנחה או למשלוח.", label: "למוצרי המותגים", href: "/deals", external: false, tone: "festival", images: imagesFor(["xiaomi","anker","baseus","dreame","roborock"]) });
  }
  // Only promote provider campaign links if their source product is actually
  // in the vetted branded catalog. Other promotion products may be generic.
  for (const b of banners?.banners ?? []) {
    if (b.source !== "featuredpromo" || b.status !== "published" || b.timing !== "active" || !b.link || !b.sourceUrl || !validAffiliateUrl(b.link, b.sourceUrl)) continue;
    const product = snapshot.items.find(p => p.productUrl === b.sourceUrl || b.sourceUrl?.includes("/item/" + p.id + "."));
    if (!product || !brandOf(product)) continue;
    slides.push({key: b.id, eyebrow: "קמפיין פעיל מממשק AliExpress", title: b.title, subtitle: b.description ?? "מוצר ממותג שמופיע בקמפיין של AliExpress.", notice: "תנאי המבצע והמשלוח נקבעים ב־AliExpress. ייחוס עמלה טרם אומת.", label: "למוצר בקמפיין", href: b.link, external: true, tone: "ruby", images: [b.image ?? product.image ?? ""].filter(Boolean)});
    if (slides.length >= 4) break;
  }
  if (live.has("tech")) slides.push({key:"tech-brands",eyebrow:"מותגים שעושים את ההבדל",title:"טכנולוגיה עם שם מוכר.",subtitle:"מטענים, אביזרי מחשב ומוצרי סלולר של מותגים מזוהים מהקטלוג שלנו.",notice:"זהו אוסף מוצרים, לא מבצע עם הנחה מובטחת.",label:"גלו מותגי טכנולוגיה",href:"/categories/tech",external:false,tone:"midnight",images:imagesFor(["ugreen","baseus","anker","xiaomi"])});
  if (live.has("home")) slides.push({key:"smart-home",eyebrow:"חיים חכמים יותר",title:"מחדשים את הבית, חכם.",subtitle:"מוצרי בית חכם ומותגי ניקיון מוכרים, עם בדיקת עלות לפני הקנייה.",notice:"המחיר, המשלוח והזמינות הסופיים מוצגים בקופה.",label:"למותגים לבית",href:"/categories/home",external:false,tone:"emerald",images:imagesFor(["dreame","roborock","reolink","yeelight"])});
  // Evergreen slide so the hero never renders empty (the dated 11.11 slide ended 2026-11-19
  // and left a blank hero whenever no category was live). Makes no offer or price claim.
  if (!slides.length) slides.push({key:"catalog",eyebrow:"קטלוג מותגים מ־AliExpress",title:"מותגים שאתם מכירים. בודקים לפני שקונים.",subtitle:"מוצרים ממותגים מוכרים, עם מחיר מהספק, זמן הבדיקה שלו והערכת מס יבוא לישראל.",notice:"זהו אוסף מוצרים, לא מבצע. המחיר והמשלוח הסופיים מוצגים בקופה של AliExpress.",label:"לכל המוצרים",href:"/deals",external:false,tone:"midnight",images:imagesFor(["ugreen","baseus","anker","xiaomi"])});

  // Moving strip: only brands with listed products, and the provider's best sellers.
  const logoItems: MarqueeItem[] = available.map((b) => ({
    key: b.slug, href: "/brands/" + b.slug, label: b.name + " - " + brandCounts.get(b.slug) + " מוצרים",
    node: <BrandLogo slug={b.slug} name={b.name} />,
  }));
  const sellerItems: MarqueeItem[] = ranked.filter((p) => p.image && (p.orders ?? 0) > 0).slice(0, 12).map((p) => ({
    key: p.id, href: "/products/" + p.id,
    label: productDisplayTitle(p.title, brandOf(p)?.name ?? null) + " · " + (p.orders ?? 0).toLocaleString("he-IL") + " מכירות מדווחות לפי הספק",
    // eslint-disable-next-line @next/next/no-img-element
    node: <><img src={thumbUrl(p.image!)} alt="" width={64} height={64} loading="lazy" decoding="async" referrerPolicy="no-referrer" /><span><b>{(p.orders ?? 0).toLocaleString("he-IL")}</b> מכירות מדווחות</span></>,
  }));

  // Brand wall (hero) and brand shelves: brands ordered by how many products they have listed.
  const byCount = [...available].sort((a, b) => (brandCounts.get(b.slug) ?? 0) - (brandCounts.get(a.slug) ?? 0));
  const wall = byCount.slice(0, 9);
  const shelves = byCount
    .map((b) => ({ brand: b, items: ranked.filter((p) => brandOf(p)?.slug === b.slug).slice(0, 4) }))
    .filter((s) => s.items.length >= 2)
    .slice(0, 4);
  const quick = byCount.slice(0, 5);
  return <PublicShell><main id="main" className="dpb-main bl-home sr-home">
    <section className="sr-hero" aria-labelledby="bl-hero-title">
      <div className="bl-wrap sr-hero-grid">
        <div className="sr-hero-copy">
          <p className="sr-eyebrow">קטלוג מותגים בעברית, לקונים בישראל</p>
          <h1 id="bl-hero-title">מותגים מוכרים. <mark>מחירים שנבדקו.</mark> קונים עם יותר מידע.</h1>
          <p className="sr-hero-lead">מגלים מוצרים של מותגים מוכרים, רואים מחירים בשקלים ובדיקות מחיר קודמות כשיש, ומעריכים מסי יבוא לישראל. לפני התשלום בודקים את המוכר, המשלוח והמחיר הסופי בקופה.</p>
          <form action="/search" className="sr-hero-search" role="search" aria-label="חיפוש בקטלוג">
            <Search size={20} aria-hidden="true"/>
            <input name="q" maxLength={80} placeholder="איזה מותג או מוצר מחפשים?" aria-label="חיפוש מותג או מוצר בקטלוג"/>
            <button type="submit">חיפוש</button>
          </form>
          {quick.length > 0 && <div className="sr-quick" aria-label="מותגים מבוקשים">
            <span>מבוקשים:</span>
            {quick.map((b) => <Link key={b.slug} href={"/brands/" + b.slug} dir="ltr">{b.name}</Link>)}
          </div>}
          <div className="bl-hero-cta">
            <Link className="bl-cta" href="/deals">גלו מוצרים <ArrowUpLeft size={17} aria-hidden="true"/></Link>
            <Link className="bl-cta is-ghost" href="/catalog-status">איך אנחנו בודקים?</Link>
          </div>
        </div>
        {wall.length > 0 && <nav className="sr-wall" aria-label="המותגים עם הכי הרבה מוצרים בקטלוג">
          {wall.map((b) => <Link key={b.slug} href={"/brands/" + b.slug} className="sr-wall-tile" aria-label={b.name + " - " + productsCount(brandCounts.get(b.slug) ?? 0)}>
            <BrandLogo slug={b.slug} name={b.name}/>
            <small>{productsCount(brandCounts.get(b.slug) ?? 0)}</small>
          </Link>)}
        </nav>}
      </div>
    </section>
    <HomeMarquee label="מותגים ומוצרים נמכרים בקטלוג (נתוני מכירות של הספק)" rows={[{ key: "brands", items: logoItems }, { key: "sellers", items: sellerItems, reverse: true }]}/>
    {shelves.length > 0 && <section className="bl-wrap sr-shelves" aria-labelledby="sr-shelves-title">
      <div className="bl-section-head"><div><p className="sr-eyebrow">קונים לפי מותג</p><h2 id="sr-shelves-title">המדפים של המותגים</h2><p>המוצרים הנמכרים ביותר של כל מותג, לפי נתוני הספק. זה לא דירוג איכות.</p></div><Link href="/brands" className="bl-more">כל המותגים <ArrowUpLeft size={16} aria-hidden="true"/></Link></div>
      <div className="sr-shelf-list">{shelves.map(({ brand, items }) => <article className="sr-shelf" key={brand.slug} aria-label={"מוצרי " + brand.name}>
        <header className="sr-shelf-head">
          <span className="sr-shelf-logo"><BrandLogo slug={brand.slug} name={brand.name}/></span>
          <span className="sr-shelf-count">{productsCount(brandCounts.get(brand.slug) ?? 0)} בקטלוג</span>
          <Link className="sr-shelf-all" href={"/brands/" + brand.slug}>לכל מוצרי <span dir="ltr">{brand.name}</span> <ArrowUpLeft size={15} aria-hidden="true"/></Link>
        </header>
        <ul className="sr-shelf-items">{items.map((p) => <li key={p.id}>
          <Link href={"/products/" + p.id} className="sr-mini">
            <span className="sr-mini-media"><ProductImage src={p.image} alt="" thumb lazy label={brand.name}/></span>
            <span className="sr-mini-title" dir="auto">{productDisplayTitle(p.title, brandOf(p)?.name ?? null)}</span>
            {p.price ? <strong dir="ltr">{formatMoney(p.price, p.currency)}</strong> : <strong className="is-none">אין מחיר עדכני</strong>}
            {p.price && <small className={freshnessLabel(p.priceObservedAt) ? undefined : "is-unknown"}>{freshnessLabel(p.priceObservedAt) ?? "זמן הבדיקה אינו ידוע"} · סופי בקופה</small>}
          </Link>
        </li>)}</ul>
      </article>)}</div>
    </section>}
    <div className="bl-wrap dpb-hero-shell"><CampaignCarousel slides={slides}/></div>
    <section className="bl-wrap dpb-brands" aria-labelledby="dpb-brands-title">
      <div className="bl-section-head"><div><p className="sr-eyebrow">מדריך המותגים</p><h2 id="dpb-brands-title">המותגים שאתם מכירים</h2><p>מוצרים שמזוהים עם מותגים מוכרים ב־AliExpress. מוכר מורשה ומקוריות טרם אומתו.</p></div><Link href="/brands" className="bl-more">לעמוד המותגים <ArrowUpLeft size={16} aria-hidden="true"/></Link></div>
      {available.length ? <div className="dpb-logo-grid">{available.slice(0,12).map(b =>
        <Link className="dpb-logo-tile" key={b.slug} href={"/brands/"+b.slug} aria-label={b.name + " - " + productsCount(brandCounts.get(b.slug) ?? 0)}><BrandLogo slug={b.slug} name={b.name}/><small aria-hidden="true">{productsCount(brandCounts.get(b.slug) ?? 0)}</small></Link>
      )}</div> : <div className="bl-empty-note">הקטלוג הממותג מתרענן. נציג רק מוצרים שעברו סינון.</div>}
    </section>
    <section className="bl-wrap sr-cats-wrap" aria-labelledby="sr-cats-title">
      <div className="bl-section-head"><div><p className="sr-eyebrow">לפי תחום</p><h2 id="sr-cats-title">מה מחפשים היום?</h2></div></div>
      <div className="dpb-categories" role="list">
      {groups.map((g)=>{
        const picks = ranked.filter(p => {const b=brandOf(p); return b && (g.brands as readonly string[]).includes(b.slug) && p.image;});
        if (!picks.length) return null;
        const viaCategory = !(g.key === "audio" || g.key === "charging" || g.key === "vacuum");
        if (viaCategory && !live.has(g.key)) return null;
        const product = picks[0];
        const Icon = g.icon;
        const href = g.key === "audio" || g.key === "charging" || g.key === "vacuum" ? "/deals?q="+encodeURIComponent(g.brands[0]) : "/categories/" + g.key;
        return <Link className="dpb-category" href={href} key={g.key} role="listitem">
          <span className="dpb-category-copy"><Icon size={19} aria-hidden="true"/><strong>{g.label}</strong><small>{g.sub}</small><span className="dpb-category-button">למוצרים <ArrowUpLeft size={15} aria-hidden="true"/></span></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image ?? undefined} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
        </Link>;
      })}
      </div>
    </section>
    <section className="bl-wrap bl-featured" id="products" aria-labelledby="bl-featured-title">
      <div className="bl-section-head"><div><p className="sr-eyebrow">הנמכרים ביותר</p><h2 id="bl-featured-title">פופולריים לפי נתוני הספק</h2><p>מוצרים שסודרו לפי מספר מכירות מדווח. זה לא דירוג איכות או המלצה אישית.</p></div><Link href="/deals" className="bl-more">לכל המוצרים <ArrowUpLeft size={16} aria-hidden="true"/></Link></div>
      {featured.length ? <div className="bl-grid">{featured.map((p, i)=><ProductCard key={p.id} item={p} eager={i < 4} usdRate={usdRate}/>)}</div> : <div className="bl-empty-note">ממתינים למוצרים ממותגים שעברו בדיקה.</div>}
    </section>
    <section className="sr-how-band" aria-labelledby="bl-how-title">
      <div className="bl-wrap bl-how">
        <h2 id="bl-how-title">שלושה צעדים לקנייה עם יותר מידע</h2>
        <ol>
          <li><Search size={22} aria-hidden="true"/><strong>מוצאים מותג</strong><span>רק מוצרים שהמותג שלהם זוהה גם בשם וגם בחנות.</span></li>
          <li><Calculator size={22} aria-hidden="true"/><strong>רואים מחיר עם זמן בדיקה</strong><span>מחיר מדווח בשקלים עם זמן הבדיקה, ואומדן מסים לישראל.</span></li>
          <li><BadgeCheck size={22} aria-hidden="true"/><strong>קונים ב־AliExpress</strong><span>בודקים את המוכר, הדגם המדויק והמשלוח. המחיר הסופי נקבע בקופה.</span></li>
        </ol>
      </div>
    </section>
    <section className="bl-wrap bl-trust"><ShieldCheck size={20} aria-hidden="true"/><p>{BRAND.name} הוא אתר שותפים עצמאי. זיהוי מותג אינו אימות מקוריות. בדקו את החנות, הביקורות, השילוח והמחיר בקופה לפני כל רכישה.</p><Link href="/disclosure">גילוי נאות <ArrowLeft size={15} aria-hidden="true"/></Link></section>
  </main></PublicShell>;
}
