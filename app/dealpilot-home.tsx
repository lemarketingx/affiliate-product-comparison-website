import Link from "next/link";
import { ArrowUpLeft, ArrowLeft, BadgeCheck, ShieldCheck, Truck, Calculator, Flame, Headphones, Camera, Home, PlugZap, Laptop, Sparkles } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { BRANDS, identifyListedBrand } from "../lib/dealpilot/brands";
import type { Banner, CampaignRecord } from "../lib/aliexpress/banners";
import { validAffiliateUrl } from "../lib/aliexpress/catalog-build";
import type { CatalogItem } from "../lib/aliexpress/catalog";
import { formatMoney } from "../lib/dealpilot/urls";
import { PublicShell } from "./public-shell";
import BrandLogo from "./brand-logo";
import CampaignCarousel, { type PromoSlide } from "./campaign-carousel";

function imageOf(p: CatalogItem) { return p.image ?? null; }
function brandOf(p: CatalogItem) { return identifyListedBrand(p); }

function FeaturedTile({ item }: { item: CatalogItem }) {
  const brand = brandOf(item);
  return <article className="dpb-product">
    <div className="dpb-product-top"><span className="dpb-product-logo">{brand && <BrandLogo slug={brand.slug} name={brand.name}/>}</span><span className="dpb-product-note">מוצר מותג</span></div>
    <Link href={"/products/" + item.id} className="dpb-product-media" aria-label={"פרטים על " + item.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image ?? undefined} alt={item.title} loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
    </Link>
    <h3 dir="auto"><Link href={"/products/" + item.id}>{item.title}</Link></h3>
    <p className="dpb-product-orders">{item.orders?.toLocaleString("he-IL") ?? "לא ידוע"} מכירות מדווחות</p>
    <div className="dpb-product-footer"><span className="dpb-price" dir="ltr">{formatMoney(item.price,item.currency)}</span><Link href={"/products/" + item.id} className="dpb-product-cta">לפרטים <ArrowUpLeft size={16}/></Link></div>
  </article>;
}

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
  void usdRate;
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
  slides.push({key:"tech-brands",eyebrow:"מותגים שעושים את ההבדל",title:"טכנולוגיה עם שם מוכר.",subtitle:"מטענים, אביזרי מחשב ומוצרי סלולר של מותגים מזוהים מהקטלוג שלנו.",notice:"זהו אוסף מוצרים, לא מבצע עם הנחה מובטחת.",label:"גלו מותגי טכנולוגיה",href:"/categories/tech",external:false,tone:"midnight",images:imagesFor(["ugreen","baseus","anker","xiaomi"])});
  slides.push({key:"smart-home",eyebrow:"חיים חכמים יותר",title:"מחדשים את הבית, חכם.",subtitle:"מוצרי בית חכם ומותגי ניקיון מוכרים, עם בדיקת עלות לפני הקנייה.",notice:"המחיר, המשלוח והזמינות הסופיים מוצגים בקופה.",label:"למותגים לבית",href:"/categories/home",external:false,tone:"emerald",images:imagesFor(["dreame","roborock","reolink","yeelight"])});

  return <PublicShell><main id="main" className="dpb-main">
    {/* One page-level heading for screen readers and search engines; the visual hero is the carousel. */}
    <h1 className="sr-only">DealPilot: מותגים מוכרים מ־AliExpress, במחירים מעודכנים בשקלים</h1>
    <div className="fp-wrap dpb-hero-shell"><CampaignCarousel slides={slides}/></div>
    <section className="fp-wrap dpb-brands" aria-labelledby="dpb-brands-title">
      <div className="dpb-section-head"><div><span className="dpb-eyebrow">THE BRANDS YOU KNOW</span><h2 id="dpb-brands-title">המותגים שאתם מכירים</h2><p>מוצרים שמזוהים עם מותגים מוכרים ב־AliExpress. מוכר מורשה ומקוריות טרם אומתו.</p></div><Link href="/brands" className="dpb-all-link">כל המותגים <ArrowUpLeft size={16}/></Link></div>
      {available.length ? <div className="dpb-logo-grid">{available.slice(0,12).map(b =>
        <Link className="dpb-logo-tile" key={b.slug} href={"/brands/"+b.slug} aria-label={b.name + " - " + brandCounts.get(b.slug) + " מוצרים"}><BrandLogo slug={b.slug} name={b.name}/></Link>
      )}</div> : <div className="dpb-empty">הקטלוג הממותג מתרענן. נציג רק מוצרים שעברו סינון.</div>}
    </section>
    <section className="fp-wrap dpb-categories" aria-label="מוצרים ממותגים לפי תחום">
      {groups.map((g,i)=>{
        const picks = ranked.filter(p => {const b=brandOf(p); return b && (g.brands as readonly string[]).includes(b.slug) && p.image;});
        if (!picks.length) return null;
        const product = picks[0];
        const Icon = g.icon;
        const href = g.key === "audio" || g.key === "charging" || g.key === "vacuum" ? "/deals?q="+encodeURIComponent(g.brands[0]) : "/categories/" + g.key;
        return <Link className={"dpb-category dpb-category-"+(i%3)} href={href} key={g.key}>
          <span className="dpb-category-copy"><Icon size={19}/><strong>{g.label}</strong><small>{g.sub}</small><span className="dpb-category-button">למוצרים <ArrowUpLeft size={15}/></span></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image ?? undefined} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
        </Link>;
      })}
    </section>
    <section className="fp-wrap dpb-service-strip" aria-label="למה DealPilot">
      <div><Truck size={23}/><span><strong>קנייה לישראל</strong><small>בדקו משלוח וזמינות בקופה</small></span></div>
      <div><Calculator size={23}/><span><strong>מחשבון עלות קנייה</strong><small>משלוח, מע״מ ועלויות ידועות</small></span></div>
      <div><Flame size={23}/><span><strong>קמפיינים מתחלפים</strong><small>רק קישורים ומבצעים עם מקור</small></span></div>
      <div><BadgeCheck size={23}/><span><strong>קטלוג ממותג</strong><small>מותגים מזוהים, לא מוצרים אנונימיים</small></span></div>
    </section>
    <section className="fp-wrap dpb-featured" id="products">
      <div className="dpb-section-head"><div><span className="dpb-eyebrow">CURATED FOR YOU</span><h2>מוצרים נבחרים</h2><p>מוצרים מדווחים מהקטלוג, במחירי ספק בשקלים. ללא אחוזי הנחה מומצאים.</p></div><Link href="/deals" className="dpb-all-link">לכל המוצרים <ArrowUpLeft size={16}/></Link></div>
      {featured.length ? <div className="dpb-products-grid">{featured.map(p=><FeaturedTile key={p.id} item={p}/>)}</div> : <div className="dpb-empty">ממתינים למוצרים ממותגים שעברו בדיקה.</div>}
    </section>
    <section className="fp-wrap dpb-trust"><ShieldCheck size={20}/><p>DealPilot הוא אתר שותפים עצמאי. זיהוי מותג אינו אימות מקוריות. מומלץ לבדוק את החנות, הביקורות, השילוח והמחיר בקופה לפני כל רכישה.</p><Link href="/disclosure">גילוי נאות <ArrowLeft size={15}/></Link></section>
  </main></PublicShell>;
}
