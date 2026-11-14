import { Send, Radio, Camera, Pin, Video, Play } from "lucide-react";
import { requireAdmin } from "../../../../lib/dealpilot/auth";
const channels = [
  ["Telegram", Send, "Bot API רשמי, הרשאת מנהל לערוץ ואישור לפני שליחה"],
  ["Facebook", Radio, "הרשאות Meta לעמוד, אסימון תקף ואישור תוכן"],
  ["Instagram", Camera, "חשבון מתאים והרשאות פרסום של Meta"],
  ["Pinterest", Pin, "הרשאות חשבון ואפליקציה מאושרת"],
  ["TikTok", Video, "הרשאת Content Posting API ובדיקת אפליקציה"],
  ["YouTube Shorts", Play, "הרשאת ערוץ דרך API רשמי ושירות וידאו"],
] as const;
export default async function ChannelsPage() {
  await requireAdmin();
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
      <div className="dp-notice">
        לא נשלחות הודעות או בקשות פרסום. חיבור ערוץ דורש הגדרה מאובטחת, בדיקת
        הרשאות ואישור בעל המערכת.
      </div>
    </>
  );
}
