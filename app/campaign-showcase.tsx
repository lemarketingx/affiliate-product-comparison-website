import Link from "next/link";
import { ArrowUpLeft, CalendarDays, ShieldCheck } from "lucide-react";
import type { CampaignRecord, Banner } from "../lib/aliexpress/banners";

const ELEVEN_START = Date.parse("2026-11-01T00:00:00+02:00");
const ELEVEN_END = Date.parse("2026-11-19T00:00:00+02:00");
const eventPattern = /11\.11|single.?day|black friday|cyber monday|choice day|anniversary|sale|festival|promotion/i;
const date = (iso: string) => new Intl.DateTimeFormat("he-IL", {
  day: "numeric", month: "long", timeZone: "Asia/Jerusalem",
}).format(new Date(iso));

export default function CampaignShowcase({ campaigns, banners, now = Date.now() }: {
  campaigns: CampaignRecord[]; banners: Banner[]; now?: number;
}) {
  const elevenActive = now >= ELEVEN_START && now < ELEVEN_END;
  const current = campaigns
    .filter((p) => eventPattern.test(p.name))
    .filter((p) => p.startsAt && p.endsAt && p.timing === "active")
    .filter((p) => !elevenActive || !/11\.11|single.?day/i.test(p.name))
    .slice(0, 3);
  if (!elevenActive && !current.length) return null;
  return (
    <section className="fp-wrap fp-campaigns" aria-labelledby="fp-campaigns-title">
      <div className="fp-campaigns-heading">
        <div>
          <span className="fp-kicker">אירועים ומבצעים עונתיים</span>
          <h2 id="fp-campaigns-title">מה חדש ב־AliExpress?</h2>
          <p>אירועים שהוכרזו על ידי AliExpress או הוחזרו מממשק הקמפיינים שלה. כל הטבה ומחיר כפופים לבדיקת זכאות בישראל.</p>
        </div>
        <Link className="fp-link" href="/deals">לכל המוצרים <ArrowUpLeft size={16} aria-hidden="true" /></Link>
      </div>
      <div className="fp-campaigns-grid">
        {elevenActive && (
          <article className="fp-campaign-feature">
            <div className="fp-campaign-copy">
              <span className="fp-campaign-pill"><span className="fp-campaign-live-dot" /> אירוע שהוכרז לשנת 2026</span>
              <span className="fp-campaign-number" dir="ltr">11.11</span>
              <h3>פסטיבל הקניות הגדול של AliExpress</h3>
              <p>על פי הודעת AliExpress לארה״ב, אירוע 11.11 מתקיים בין 1 ל־18 בנובמבר 2026. ההטבות, המחירים והמשלוח בישראל עשויים להיות שונים.</p>
              <div className="fp-campaign-actions">
                <Link href="/deals" className="fp-campaign-button">גלו מוצרים ב־DealPilot <ArrowUpLeft size={17} aria-hidden="true" /></Link>
                <a href="https://www.prnewswire.com/news-releases/aliexpress-celebrates-11-11-global-shopping-festival-november-118-with-mega-deals-as-brand-marks-its-first-anniversary-302923157.html" target="_blank" rel="noopener noreferrer" className="fp-campaign-source">להודעה הרשמית</a>
              </div>
              <span className="fp-campaign-scope">המוצרים באתר אינם בהכרח משתתפים בהנחות האירוע</span>
            </div>
            <div className="fp-campaign-art" aria-hidden="true"><span>GLOBAL</span><strong>11·11</strong><em>SHOPPING FESTIVAL</em><span>2026</span></div>
          </article>
        )}
        {current.map((p) => {
          const link = banners.find((b) => b.source === "featuredpromo" && b.title === p.name && b.status === "published" && b.link)?.link;
          return (
            <article key={p.name} className="fp-campaign-tile">
              <span className="fp-campaign-tile-label"><CalendarDays size={15} aria-hidden="true" /> מופיע ב־Affiliate API</span>
              <h3 dir="auto">{p.name}</h3>
              <p dir="auto">{p.description ?? "אירוע שמופיע בממשק הקמפיינים של AliExpress."}</p>
              <span className="fp-campaign-period">{p.startsAt && p.endsAt ? date(p.startsAt) + " – " + date(p.endsAt) : "תקופה לא דווחה"}</span>
              {link ? (
                <a className="fp-campaign-tile-link" href={link} target="_blank" rel="sponsored noopener noreferrer">
                  לצפייה במוצר מהקמפיין <ArrowUpLeft size={16} aria-hidden="true" />
                </a>
              ) : (
                <span className="fp-campaign-tile-muted">קישור קידום לקמפיין טרם אומת</span>
              )}
            </article>
          );
        })}
      </div>
      <p className="fp-fine fp-campaign-note"><ShieldCheck size={15} aria-hidden="true" />
        קישורי מוצרים עשויים להניב עמלה. אין התחייבות להנחה או לזכאות למשלוח לישראל. אימות ייחוס עמלות נעשה בדוחות AliExpress.
      </p>
    </section>
  );
}
