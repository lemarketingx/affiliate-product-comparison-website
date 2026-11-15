import Link from "next/link";
import { ChevronLeft, BadgeCheck, Coins, Percent, ShieldQuestion, Send, PackageSearch } from "lucide-react";
import type { CatalogSnapshot, CatalogItem } from "../lib/aliexpress/catalog";
import { brands } from "../lib/dealpilot/brands";
import { shelves } from "../lib/dealpilot/shelves";
import { PublicShell } from "./public-shell";
import LiveCatalog from "./live-catalog";
import HeroCarousel, { type Slide } from "./hero-carousel";
import { ProductCard, discountOf } from "./product-card";
import { BrandMark } from "./brand-mark";

export function ChannelCta() {
  const telegram = process.env.DEALPILOT_TELEGRAM_URL;
  const whatsapp = process.env.DEALPILOT_WHATSAPP_URL;
  if (!telegram && !whatsapp) return null;
  return (
    <section className="og-wrap og-channel">
      <div>
        <span className="og-kicker">בלי לפספס</span>
        <h2>מוצרים חדשים מהמותגים, ישר לטלפון.</h2>
        <p>ערוץ עדכונים שקט: מותגים מזוהים לפי שם החנות, בלי ספאם.</p>
      </div>
      <div className="og-channel-actions">
        {whatsapp && (
          <a className="og-btn og-btn-go" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <Send size={18} /> לערוץ בוואטסאפ
          </a>
        )}
        {telegram && (
          <a className="og-btn og-btn-ghost" href={telegram} target="_blank" rel="noopener noreferrer">
            <Send size={18} /> לערוץ בטלגרם
          </a>
        )}
      </div>
    </section>
  );
}

function SectionHead({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="og-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {href && (
        <Link className="og-pill-link" href={href}>
          {cta} <ChevronLeft size={16} />
        </Link>
      )}
    </div>
  );
}

function buildSlides(items: CatalogItem[]): Slide[] {
  const byBrand = new Map<string, CatalogItem[]>();
  for (const p of items) byBrand.set(p.categorySlug, [...(byBrand.get(p.categorySlug) ?? []), p]);
  const img = (list: CatalogItem[]) => list.map((p) => p.image).filter((x): x is string => Boolean(x));
  const mixed = [...byBrand.values()].map((l) => l[0]).filter(Boolean);
  const slides: Slide[] = [
    {
      key: "intro",
      kicker: "מותגים מזוהים לפי שם החנות",
      title: "המותגים שאתם מכירים, במחירים של אליאקספרס.",
      subtitle: "שיאומי, אנקר, דרימי, יוגרין ועוד. מחירים בשקלים; מקוריות ומעמד החנות דורשים אימות.",
      cta: "לכל המותגים",
      href: "/brands",
      accent: "#ff6900",
      images: img(mixed).slice(0, 3),
    },
  ];
  const discounted = items.filter((p) => discountOf(p)).sort((a, b) => (discountOf(b) ?? 0) - (discountOf(a) ?? 0));
  if (discounted.length >= 2)
    slides.push({
      key: "deals",
      kicker: "הנחות לפי הספק",
      title: `עד ${discountOf(discounted[0])}% הנחה ממחיר המקור.`,
      subtitle: "המוצרים עם הפער הגדול ביותר ממחיר המקור שהחנויות הרשמיות מדווחות.",
      cta: "למבצעים",
      href: "/deals?sort=discount",
      accent: "#16a34a",
      images: img(discounted).slice(0, 3),
    });
  const top = [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  for (const [slug, list] of top) {
    const b = brands.find((x) => x.slug === slug);
    if (!b) continue;
    slides.push({
      key: "brand-" + slug,
      kicker: "מוכרים המזוהים בשם המותג ב־AliExpress",
      wordmark: b.name,
      logo: b.logo,
      title: b.knownFor,
      subtitle: `${list.length} מוצרים של ${b.he} עכשיו באתר, במחירים בשקלים.`,
      cta: "לחנות של " + b.he,
      href: "/brands/" + slug,
      accent: b.accent,
      images: img(list).slice(0, 3),
    });
  }
  return slides;
}

export default function DealPilotHome({ snapshot }: { snapshot: CatalogSnapshot }) {
  const items = snapshot.items;
  const counts: Record<string, number> = {};
  for (const p of items) counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;
  const shelfData = shelves
    .map((s) => {
      const list = items.filter((p) => p.shelf === s.slug);
      return { ...s, list, brandCount: new Set(list.map((p) => p.categorySlug)).size };
    })
    .filter((s) => s.list.length > 0 || items.length === 0)
    .slice(0, 6);
  const topBrands = brands
    .filter((b) => (counts[b.slug] ?? 0) > 0)
    .sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0))
    .slice(0, 3);
  return (
    <PublicShell>
      <main id="main">
        <div className="dp-hero og-hero og-wrap">
          <h1 className="og-visually-hidden">DealPilot: המותגים שאתם מכירים, מוכרים המזוהים בשם המותג שלהם</h1>
          <HeroCarousel slides={buildSlides(items)} />
        </div>

        <section className="og-wrap og-block" aria-labelledby="brands-title">
          <div className="og-head">
            <div>
              <h2 id="brands-title">המותגים שאתם מכירים</h2>
              <p>רק מוצרים מחנויות ששמן מזוהה עם המותג, במחירים בשקלים. סטטוס רשמי אינו מאומת.</p>
            </div>
            <Link className="og-pill-link" href="/brands">
              כל המותגים <ChevronLeft size={16} />
            </Link>
          </div>
          <ul className="og-brandwall">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={"/brands/" + b.slug} style={{ "--accent": b.accent } as React.CSSProperties}>
                  <BrandMark slug={b.slug} className="og-bw-name" />
                  <span className="og-bw-meta">
                    {counts[b.slug] ? counts[b.slug] + " מוצרים" : b.he}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="og-wrap og-block" aria-label="קטגוריות">
          <ul className="og-tiles">
            {shelfData.map((s) => (
              <li key={s.slug}>
                <Link href={"/categories/" + s.slug} className="og-tile">
                  <div className="og-tile-copy">
                    <strong>{s.label}</strong>
                    <span>{s.blurb}</span>
                    <em>
                      {s.list.length ? `${s.list.length} מוצרים · ${s.brandCount} מותגים` : "לקטגוריה"}
                      <ChevronLeft size={14} />
                    </em>
                  </div>
                  <div className="og-tile-img">
                    {s.list[0]?.image ? (
                      <img src={s.list[0].image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <PackageSearch size={44} aria-hidden="true" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="og-wrap og-trust" aria-label="למה DealPilot">
          <div>
            <BadgeCheck aria-hidden="true" />
            <span><strong>מותגים נבחרים</strong>מוצר עולה רק מחנות בשם המותג</span>
          </div>
          <div>
            <Coins aria-hidden="true" />
            <span><strong>מחירים בשקלים</strong>ישר מ־AliExpress, מתעדכנים כל כמה שעות</span>
          </div>
          <div>
            <Percent aria-hidden="true" />
            <span><strong>הנחות אמיתיות בלבד</strong>רק מחיר מקור שהספק דיווח, בלי המצאות</span>
          </div>
          <div>
            <ShieldQuestion aria-hidden="true" />
            <span><strong>אחריות ויבוא, בגלוי</strong><Link href="/warranty">מה ההבדל מקנייה בארץ</Link></span>
          </div>
        </section>

        <LiveCatalog snapshot={snapshot} compact title="מוצרים נבחרים" />

        {topBrands.map((b) => {
          const list = items.filter((p) => p.categorySlug === b.slug).slice(0, 10);
          return (
            <section key={b.slug} className="og-wrap og-block og-brandrow" style={{ "--accent": b.accent } as React.CSSProperties}>
              <SectionHead
                title={`${b.he} · ${b.name}`}
                sub={"מחנויות בשם המותג: " + b.knownFor}
                href={"/brands/" + b.slug}
                cta={"לכל המוצרים של " + b.he}
              />
              <div className="og-rail">
                {list.map((p) => (
                  <ProductCard key={p.id} item={p} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="og-wrap og-block">
          <div className="og-truth">
            <div>
              <span className="og-kicker">לפני שחוסכים</span>
              <h2>זול יותר. ומה עם האחריות?</h2>
              <p>
                שם חנות שנראה רשמי אינו מוכיח מקוריות. קנייה ביבוא אישי בדרך כלל אינה כוללת אחריות של
                היבואן הרשמי בישראל. לפעמים ההפרש שווה את זה, ולפעמים לא. אנחנו מסבירים מה
                לבדוק, ואתם מחליטים.
              </p>
            </div>
            <Link className="og-btn og-btn-light" href="/warranty">
              אחריות ויבוא אישי, בקצרה <ChevronLeft size={18} />
            </Link>
          </div>
        </section>

        <ChannelCta />
      </main>
    </PublicShell>
  );
}
