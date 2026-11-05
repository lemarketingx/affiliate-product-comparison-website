"use client";
import { useState } from "react";
import { ArrowUpLeft, ShieldCheck, Check, MessageCircle, Phone, Mail, LoaderCircle, Home, HeartHandshake, Compass } from "lucide-react";
import { Brand, Success } from "../../components";
import { PURPOSE, normalizePhone } from "../../../lib/domain";
import type { Settings } from "../../../lib/domain";
export default function Capture({ code, partnerName, settings, demo = false }: { code: string; partnerName: string; settings: Settings; demo?: boolean }) {
  const [success, setSuccess] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <div className="public-page">
    {demo && <div className="public-demo-banner">טופס לדוגמה בלבד · הפרטים לא יישלחו ולא יישמרו</div>}
    <header className="public-header"><a href="/" aria-label="קשר"><Brand name={settings.businessName}/></a><a href="/">לאזור השותפים<ArrowUpLeft size={15}/></a></header>
    <div className="public-content">
      <section className="public-copy"><span className="public-eyebrow"><Home size={13}/>הבית הבא שלכם מתחיל בשיחה</span><h1>החלטה גדולה.<br/><span>מתחילים בקשר טוב.</span></h1><p>רכישת דירה, מחזור משכנתה או בדיקת האפשרויות שלכם — השאירו פרטים לשיחת היכרות עם {settings.advisorName}.</p><div className="public-benefits">{[{ icon: HeartHandshake, title: "מתחילים בהיכרות", text: "שיחה על התוכניות, הצרכים והמטרות שלכם." }, { icon: Compass, title: "מבינים את האפשרויות", text: "מענה שמתייחס למצב ולשלב שבו אתם נמצאים." }, { icon: ShieldCheck, title: "שקיפות לגבי הפרטים שלכם", text: "המידע משמש לטיפול בפנייה ולשיוך למפנה, כמפורט בטופס." }].map(({ icon: Icon, title, text }) => <div key={title}><i><Icon size={17}/></i><span><strong>{title}</strong><p>{text}</p></span></div>)}</div></section>
      <section className="public-form-card">
        {success ? <Success>{demo ? "כך ייראה אישור קליטת הפנייה. במצב ההדגמה לא נשלחו ולא נשמרו פרטים." : "הפנייה הועברה למשרד ושויכה למפנה. נציג מהמשרד יחזור אליכם בנושא הפנייה."}</Success> : <>
          <div className="referral-by"><span>{partnerName[0]}</span>הגעתם דרך {partnerName}</div>
          <h2>נעים להכיר. נדבר?</h2><p>כמה פרטים קטנים, ונוכל ליצור איתכם קשר.</p>
          <form className="form-stack" onSubmit={async e => {
            e.preventDefault(); setError(""); setBusy(true);
            const f = new FormData(e.currentTarget), phone = normalizePhone(String(f.get("phone")));
            if (!phone) { setError("יש להזין מספר טלפון ישראלי תקין."); setBusy(false); return; }
            if (demo) { setSuccess(true); setBusy(false); return; }
            try {
              const response = await fetch("/api/referrals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name: f.get("name"), phone, purpose: f.get("purpose"), consent: f.get("consent") === "on", website: f.get("website") }) });
              const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "לא הצלחנו לשלוח את הפנייה.");
              setSuccess(true);
            } catch (err) { setError(err instanceof Error ? err.message : "לא הצלחנו לשלוח. נסו שוב."); }
            finally { setBusy(false); }
          }}>
            <label className="form-field">שם מלא<input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="איך קוראים לכם?"/></label>
            <label className="form-field">טלפון לחזרה<input name="phone" type="tel" required dir="ltr" autoComplete="tel" placeholder="050-000-0000"/></label>
            <label className="form-field">במה אפשר לעזור?<select name="purpose">{Object.entries(PURPOSE).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
            <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
            <label className="checkbox-field"><input type="checkbox" name="consent" required/><span>אני מסכים/ה למסירת הפרטים ל{settings.advisorName} וליצירת קשר בנושא הפנייה שלי.</span></label>
            <details className="privacy-details"><summary>מידע על השימוש בפרטים</summary><p>מסירת הפרטים היא מרצונכם. ללא שם וטלפון לא נוכל לחזור אליכם. הפרטים ישמשו את {settings.advisorName} לטיפול בפנייה ולניהול השיוך למפנה. המפנה יוכל לראות את שם הפונה, שלב הטיפול ואת זכאותו לעמלה; הוא לא יקבל מסמכים פיננסיים. ניתן לפנות למשרד לצורך עיון במידע ובקשת תיקון. הפנייה אינה מהווה התחייבות למתן אשראי או לאישור משכנתה.</p></details>
            {error && <div className="public-error" role="alert">{error}</div>}
            <button disabled={busy} type="submit" className="btn btn-primary full-width">{busy ? <LoaderCircle size={16} className="spin"/> : <ArrowUpLeft size={17}/>}בואו נקבע שיחת היכרות</button>
          </form>
          <div className="public-form-footer">הפנייה נועדה ליצירת קשר בלבד. תנאי השירות יוסברו ישירות על ידי המשרד.{(settings.contactEmail || settings.contactPhone) && <div className="public-contact">{settings.contactPhone && <a href={"tel:" + settings.contactPhone}><Phone size={11}/><bdi>{settings.contactPhone}</bdi></a>}{settings.contactEmail && <a href={"mailto:" + settings.contactEmail}><Mail size={11}/><bdi>{settings.contactEmail}</bdi></a>}</div>}</div>
        </>}
      </section>
    </div>
    <footer className="public-footer"><span><ShieldCheck size={13}/>הפרטים שלכם משמשים לטיפול בפנייה</span><span>קשר · מחברים אנשים להזדמנויות</span></footer>
    <div className="public-background-ring" aria-hidden="true"/><div className="public-small-ring" aria-hidden="true"/>
  </div>;
}
