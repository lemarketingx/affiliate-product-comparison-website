import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, BadgeCheck, Store, Scale, ShieldQuestion, Send } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { brands } from "../lib/dealpilot/brands";
import { formatMoney } from "../lib/dealpilot/urls";
import { PublicShell, BrandDirectory } from "./public-shell";
import LiveCatalog from "./live-catalog";
import { Guilloche, Seal, serial } from "./og-bits";

const promises = [
  [BadgeCheck, "רק מותגים שאתם מכירים", "שיאומי, אנקר, יוגרין, דרימי ועוד. בלי שמות שאף אחד לא שמע עליהם."],
  [Store, "רק מהחנות הרשמית", "מוצר עולה רק אם החנות נושאת את שם המותג ו־Official Store. אימות ידני מסומן בנפרד."],
  [Scale, "מחיר אמיתי בשקלים", "המחיר מגיע מ־AliExpress. השוואה למחיר בישראל רק כשיש לנו מחיר שנבדק, עם תאריך."],
  [ShieldQuestion, "אמת על אחריות", "אומרים בגלוי מה ההבדל בין יבוא אישי ליבואן רשמי, כדי שתחליטו בעיניים פקוחות."],
] as const;

export function ChannelCta() {
  const telegram = process.env.DEALPILOT_TELEGRAM_URL;
  const whatsapp = process.env.DEALPILOT_WHATSAPP_URL;
  if (!telegram && !whatsapp) return null;
  return (
    <section className="og-wrap og-channel">
      <div>
        <span className="og-kicker">בלי לפספס</span>
        <h2>המוצרים החדשים של המותגים, ישר לטלפון.</h2>
        <p>ערוץ עדכונים שקט: מוצרים מהחנויות הרשמיות, בלי ספאם.</p>
      </div>
      <div className="og-channel-actions">
        {whatsapp && (
          <a className="og-btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
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

export default function DealPilotHome({ snapshot }: { snapshot: CatalogSnapshot }) {
  const counts: Record<string, number> = {};
  for (const p of snapshot.items) counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;
  const featured = snapshot.items[0];
  return (
    <PublicShell>
      <main id="main">
        <section className="dp-hero og-hero">
          <div className="og-wrap og-hero-grid">
            <div className="og-hero-copy">
              <span className="og-kicker">
                <BadgeCheck size={16} aria-hidden="true" /> {brands.length} מותגים · רק חנויות רשמיות
              </span>
              <h1>
                המותגים שאתם מכירים.
                <em>מהחנות הרשמית שלהם.</em>
              </h1>
              <p>
                אותם מוצרים של שיאומי, אנקר, דרימי ועוד, ישר מהחנויות הרשמיות של
                המותגים באליאקספרס, במחירים בשקלים. בלי חיקויים ובלי ניחושים.
              </p>
              <div className="og-actions">
                <Link className="og-btn" href="/brands">
                  לכל המותגים <ArrowLeft size={19} />
                </Link>
                <Link className="og-btn og-btn-ghost" href="/deals">
                  כל המוצרים
                </Link>
              </div>
            </div>
            <div className="og-cert" aria-label="תעודת מקור לדוגמה">
              <Guilloche className="og-cert-bg" />
              <div className="og-cert-head">
                <span>תעודת מקור</span>
                <em dir="ltr">CERTIFICATE OF ORIGIN</em>
              </div>
              {featured ? (
                <Link href={"/products/" + featured.id} className="og-cert-body">
                  <dl>
                    <div>
                      <dt>מותג</dt>
                      <dd dir="ltr" className="og-cert-brand">{featured.category}</dd>
                    </div>
                    <div>
                      <dt>מוצר</dt>
                      <dd dir="auto" className="og-cert-title">{featured.title}</dd>
                    </div>
                    <div>
                      <dt>נמכר על ידי</dt>
                      <dd dir="ltr">{featured.shopName}</dd>
                    </div>
                    <div>
                      <dt>מחיר באליאקספרס</dt>
                      <dd dir="auto" className="og-cert-price">{formatMoney(featured.price, featured.currency)}</dd>
                    </div>
                  </dl>
                  <span className="og-cert-serial" dir="ltr">{serial(featured.id)}</span>
                </Link>
              ) : (
                <div className="og-cert-body">
                  <dl>
                    {brands.slice(0, 4).map((b) => (
                      <div key={b.slug}>
                        <dt>{b.he}</dt>
                        <dd dir="ltr" className="og-cert-brand">{b.name} Official Store</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="og-cert-serial">הקטלוג ממתין לחיבור</span>
                </div>
              )}
              <div className="og-cert-seal">
                <Seal id="hero" size={124} />
              </div>
            </div>
          </div>
          <div className="og-marquee" aria-hidden="true">
            <div className="og-marquee-track">
              {[...brands, ...brands].map((b, i) => (
                <span key={i} dir="ltr">
                  {b.name}
                  <i>✦</i>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="og-wrap og-promises" aria-labelledby="promises-title">
          <h2 id="promises-title" className="og-visually-hidden">ההבטחות שלנו</h2>
          {promises.map(([Icon, t, d], i) => (
            <div key={t}>
              <span className="og-promise-no" dir="ltr">0{i + 1}</span>
              <Icon size={24} aria-hidden="true" />
              <strong>{t}</strong>
              <p>{d}</p>
            </div>
          ))}
        </section>

        <section className="og-section og-wrap">
          <div className="og-section-head">
            <div>
              <span className="og-kicker">אינדקס המותגים</span>
              <h2>בחרו מותג.</h2>
            </div>
            <Link className="og-link" href="/brands">
              כל המותגים <ArrowUpLeft size={17} />
            </Link>
          </div>
          <BrandDirectory counts={counts} />
        </section>

        <LiveCatalog snapshot={snapshot} compact />

        <section className="og-truth">
          <Guilloche className="og-truth-bg" size={640} rings={6} />
          <div className="og-wrap og-truth-grid">
            <div>
              <span className="og-kicker og-kicker-light">לפני שחוסכים</span>
              <h2>זול יותר. ומה עם האחריות?</h2>
            </div>
            <div>
              <p>
                מוצר מהחנות הרשמית של המותג באליאקספרס הוא מוצר מקורי, אבל בדרך כלל
                הוא לא מכוסה באחריות של היבואן הרשמי בישראל. לפעמים ההפרש שווה את זה,
                ולפעמים לא. אנחנו מסבירים מה לבדוק, ואתם מחליטים.
              </p>
              <Link className="og-btn og-btn-light" href="/warranty">
                אחריות ויבוא אישי, בקצרה <ArrowLeft size={18} />
              </Link>
            </div>
          </div>
        </section>

        <ChannelCta />
      </main>
    </PublicShell>
  );
}
