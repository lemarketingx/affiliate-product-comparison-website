import Link from "next/link";
import { ArrowUpLeft, ExternalLink } from "lucide-react";
import type { Banner } from "../lib/aliexpress/banners";

const date = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "Asia/Jerusalem" }).format(new Date(iso));

/**
 * Official AliExpress campaign banners. Images are shown unmodified (no crop,
 * no overlay); title, dates and disclosure sit outside the creative. Category
 * fallbacks are internal links and carry no affiliate claim.
 */
export default function BannerStrip({ banners, attributionConfirmed }: { banners: Banner[]; attributionConfirmed: boolean }) {
  if (!banners.length) return null;
  const campaigns = banners.some((b) => b.source !== "category");
  return (
    <section className="fp-wrap fp-banners" aria-labelledby="banners-title">
      <div className="fp-banners-head">
        <span className="fp-kicker">{campaigns ? "קמפיינים רשמיים של AliExpress" : "שערים מומלצים"}</span>
        <h2 id="banners-title">{campaigns ? "מה רץ עכשיו ב־AliExpress" : "מאיפה מתחילים?"}</h2>
      </div>
      <ul className="fp-banner-list">
        {banners.map((b) => {
          const external = b.source !== "category";
          const href = external ? "/go/b/" + b.id + "?source=banner" : b.link!;
          const body = (
            <>
              <span className={"fp-banner-media is-" + b.imageFit}>
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt={b.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                ) : (
                  <span className="fp-banner-ph" aria-hidden="true">{b.source === "category" ? "שער" : "AliExpress"}</span>
                )}
              </span>
              <span className="fp-banner-body">
                <span className="fp-banner-src">
                  {b.source === "portals" ? "באנר רשמי · AliExpress Portals" : b.source === "featuredpromo" ? "קמפיין רשמי · AliExpress" : "קטגוריה"}
                </span>
                <strong dir="auto">{b.title}</strong>
                {b.description && <small dir="auto">{b.description}</small>}
                {external && (
                  <span className="fp-banner-dates">{b.endsAt ? "בתוקף עד " + date(b.endsAt) : "תוקף הקמפיין לא דווח"}</span>
                )}
                <span className="fp-banner-cta">
                  {external ? <>לקמפיין ב־AliExpress <ExternalLink size={15} aria-hidden="true" /></> : <>לשער <ArrowUpLeft size={15} aria-hidden="true" /></>}
                </span>
              </span>
            </>
          );
          return (
            <li key={b.id} className={"fp-banner is-" + b.source}>
              {external ? (
                <a href={href} target="_blank" rel="sponsored noopener noreferrer">{body}</a>
              ) : (
                <Link href={href}>{body}</Link>
              )}
            </li>
          );
        })}
      </ul>
      {campaigns && (
        <p className="fp-fine">
          קישורי שותפים: ייתכן שנקבל עמלה.{" "}
          {attributionConfirmed ? "ייחוס העמלות אומת בחשבון השותפים." : "ייחוס העמלה בחשבון השותפים טרם אומת."} תנאי הקמפיין
          והמחירים נקבעים ב־AliExpress. <Link href="/disclosure">גילוי נאות</Link>
        </p>
      )}
    </section>
  );
}
