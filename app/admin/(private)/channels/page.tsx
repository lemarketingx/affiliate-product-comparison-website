import { Send, Radio, Camera, Pin, Video, Play } from "lucide-react";
import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getCatalog } from "../../../../lib/aliexpress/catalog";
import { identifyListedBrand } from "../../../../lib/dealpilot/brands";
import { postDrafts, type Channel } from "../../../../lib/marketing/post-drafts";
import { siteOrigin } from "../../../../lib/site-url";
const channels = [
  ["Telegram", Send, "Bot API רשמי, הרשאת מנהל לערוץ ואישור לפני שליחה"],
  ["Facebook", Radio, "הרשאות Meta לעמוד, אסימון תקף ואישור תוכן"],
  ["Instagram", Camera, "חשבון מתאים והרשאות פרסום של Meta"],
  ["Pinterest", Pin, "הרשאות חשבון ואפליקציה מאושרת"],
  ["TikTok", Video, "הרשאת Content Posting API ובדיקת אפליקציה"],
  ["YouTube Shorts", Play, "הרשאת ערוץ דרך API רשמי ושירות וידאו"],
] as const;
const DRAFT_CHANNELS: [Channel, string][] = [["telegram", "Telegram (גם ל־WhatsApp; נספר כ־Telegram)"], ["facebook", "Facebook"], ["instagram", "Instagram"]];
export default async function ChannelsPage() {
  await requireAdmin();
  // Cached catalog only: no provider call. Drafts are text to copy; nothing is sent.
  const snapshot = await getCatalog({ waitMs: 0 });
  const brandOf = (i: { title: string }) => identifyListedBrand(i as Parameters<typeof identifyListedBrand>[0])?.name ?? null;
  const drafts = DRAFT_CHANNELS.map(([channel, label]) => ({
    channel, label, items: postDrafts(snapshot.items, { origin: siteOrigin(), channel, brandOf, count: 5 }),
  }));
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">DISTRIBUTION</span>
          <h1>הערוצים שלך, בקצב שלך.</h1>
          <p className="dp-muted">
            Telegram הוא הערוץ הראשון המועדף לחיבור. אף ערוץ לא הופעל במימוש
            הנוכחי.
          </p>
        </div>
      </header>
      <div className="dp-kpi-grid">
        {channels.map(([name, Icon, requirement]) => (
          <section key={name} className="dp-panel">
            <Icon size={24} />
            <h2 dir="ltr">{name}</h2>
            <span className="dp-tag">Not connected · טרם חובר</span>
            <p>{requirement}.</p>
          </section>
        ))}
      </div>
      <section className="dp-panel" aria-labelledby="dp-drafts">
        <h2 id="dp-drafts">טיוטות פוסטים להיום</h2>
        <p className="dp-muted">
          5 מוצרים ממותגים עם מחיר עדכני, מתחלפים כל יום. העתיקו והדביקו בערוץ. המחיר מוצג עם זמן הבדיקה שלו, כי פוסט נשאר
          בערוץ אחרי שהמחיר משתנה. הקישור מוביל לעמוד המוצר באתר. קליק לרכישה שמגיע מהפוסט נרשם תחת הערוץ (בדוח הקליקים, לפי מקור).
        </p>
        {drafts.map((d) => (
          <div key={d.channel}>
            <h3 dir="ltr">{d.label}</h3>
            {d.items.length ? d.items.map((x) => (
              <textarea key={x.id} readOnly rows={6} defaultValue={x.text} aria-label={"טיוטה למוצר " + x.id} style={{ width: "100%", marginBottom: 8 }} />
            )) : <p className="dp-muted">אין כרגע מוצרים עם מחיר עדכני.</p>}
          </div>
        ))}
      </section>
      <div className="dp-notice">
        לא נשלחות הודעות או בקשות פרסום. חיבור ערוץ דורש הגדרה מאובטחת, בדיקת
        הרשאות ואישור בעל המערכת.
      </div>
    </>
  );
}
