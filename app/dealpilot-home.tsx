"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpLeft, Bot, CheckCircle2, ChevronDown, CirclePause, ClipboardCheck, ExternalLink, Filter, Globe2, Camera, LayoutDashboard, Link2, Megaphone, PackageSearch, Plus, Search, Send, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, X, Zap } from "lucide-react";
import "./dealpilot.css";
import AliExpressTester from "./aliexpress-tester";
import LiveCatalog from "./live-catalog";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";

type Category = "הכול" | "בית ומטבח" | "רכב" | "גאדג׳טים" | "סדר וארגון";
type Candidate = { id: string; name: string; category: Exclude<Category,"הכול">; emoji: string; tint: string; reason: string; status: "demo" | "unverified"; url?: string; };
const examples: Candidate[] = [
  {id:"d1",name:"מארגן מגירות מודולרי",category:"סדר וארגון",emoji:"🗂️",tint:"peach",reason:"פתרון פשוט לבעיה יומיומית",status:"demo"},
  {id:"d2",name:"משאבת אוויר קומפקטית",category:"רכב",emoji:"🚗",tint:"sky",reason:"מוצר שימושי עם הדגמה ברורה",status:"demo"},
  {id:"d3",name:"מנורת שולחן נטענת",category:"בית ומטבח",emoji:"💡",tint:"lilac",reason:"אפשר להציג יתרונות בסרטון קצר",status:"demo"},
  {id:"d4",name:"מעמד שולחני לטלפון",category:"גאדג׳טים",emoji:"📱",tint:"mint",reason:"מוצר קטן שמעניין קהל רחב",status:"demo"},
  {id:"d5",name:"מתקן לסידור כבלים",category:"סדר וארגון",emoji:"🔌",tint:"lilac",reason:"פתרון ויזואלי שקל להסביר",status:"demo"},
  {id:"d6",name:"תאורת חיישן לארון",category:"בית ומטבח",emoji:"✨",tint:"peach",reason:"שימוש ביתי נפוץ וקל לצילום",status:"demo"},
];
const categories: Category[] = ["הכול","בית ומטבח","רכב","גאדג׳טים","סדר וארגון"];
const channels = [
  {name:"אתר הדילים",label:"ממשק התצוגה פעיל",kind:"ready",icon:Globe2},
  {name:"Telegram",label:"ממתין לחיבור Bot API",kind:"pending",icon:Send},
  {name:"Facebook",label:"ממתין להרשאות Meta",kind:"pending",icon:Megaphone},
  {name:"Instagram",label:"ממתין להרשאות Meta",kind:"pending",icon:Camera},
  {name:"TikTok / YouTube",label:"חיבור בשלב מתקדם",kind:"later",icon:Zap},
  {name:"Pinterest",label:"כפוף להרשאות ואישור תוכן",kind:"later",icon:ShoppingBag},
] as const;

function safeAliUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (!(host === "aliexpress.com" || host.endsWith(".aliexpress.com") || host === "aliexpress.us" || host.endsWith(".aliexpress.us"))) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch { return null; }
}

export default function DealPilotHome({snapshot}:{snapshot: CatalogSnapshot}) {
  const [view,setView] = useState<"explore"|"control">("explore");
  const [category,setCategory] = useState<Category>("הכול");
  const [query,setQuery] = useState("");
  const [candidates,setCandidates] = useState<Candidate[]>(examples);
  const [showAdd,setShowAdd] = useState(false);
  const [url,setUrl] = useState("");
  const [name,setName] = useState("");
  const [addCategory,setAddCategory] = useState<Exclude<Category,"הכול">>("בית ומטבח");
  const [message,setMessage] = useState("");
  const [menuOpen,setMenuOpen] = useState(false);
  const filtered = useMemo(()=>candidates.filter(p=>(category==="הכול" || p.category===category) && (p.name.includes(query)||p.category.includes(query))),[candidates,category,query]);
  const unverified = candidates.filter(p=>p.status==="unverified").length;
  function addCandidate(e: React.FormEvent) {
    e.preventDefault();
    const clean = safeAliUrl(url);
    if (!clean) { setMessage("יש להזין קישור HTTPS תקין של AliExpress. קישורים מקוצרים ייבדקו אחרי חיבור API."); return; }
    if (name.trim().length < 3 || name.trim().length > 90) { setMessage("שם מוצר צריך להכיל 3–90 תווים."); return; }
    if (candidates.some(p=>p.url===clean)) { setMessage("הקישור כבר נמצא בתור."); return; }
    setCandidates(prev=>[{id:"local-"+Date.now(),name:name.trim(),category:addCategory,emoji:"📦",tint:"mint",reason:"נוסף ידנית; מחכה לאימות נתונים וקישור שותפים",status:"unverified",url:clean},...prev]);
    setUrl("");setName("");setMessage("");setShowAdd(false);setView("control");
  }
  return <div className="dp-app" dir="rtl">
    <header className="dp-header">
      <div className="dp-container dp-header-inner">
        <a className="dp-logo" href="/" aria-label="DealPilot, בית"><span className="dp-logo-mark"><Zap size={23} strokeWidth={2.6}/></span><span>deal<span className="dp-logo-accent">pilot</span><small>SMART DEALS LAB</small></span></a>
        <nav className={`dp-nav ${menuOpen?"dp-nav-open":""}`} aria-label="ניווט ראשי">
          <button className={view==="explore"?"active":""} onClick={()=>{setView("explore");setMenuOpen(false);}}>גילוי מוצרים</button>
          <button className={view==="control"?"active":""} onClick={()=>{setView("control");setMenuOpen(false);}}>מרכז שליטה</button>
          <a href="#how" onClick={()=>setMenuOpen(false)}>איך זה עובד</a>
        </nav>
        <div className="dp-header-actions"><span className="dp-system-label"><span/> סביבת פיתוח</span><button className="dp-primary dp-small" onClick={()=>setShowAdd(true)}><Plus size={17}/> הוספת מוצר</button><button className="dp-menu" aria-label="פתיחת תפריט" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><ChevronDown/></button></div>
      </div>
    </header>

    <main>
      <section className="dp-hero">
        <div className="dp-container dp-hero-grid">
          <div className="dp-hero-copy">
            <div className="dp-eyebrow"><Sparkles size={15}/> העתיד של גילוי מוצרים חכמים <span className="dp-eyebrow-sep">•</span> גרסת פיתוח</div>
            <h1>דילים טובים<br/><span>לא מוצאים במקרה.</span></h1>
            <p>מקום אחד שבו סוכני AI יאתרו מוצרים, יבדקו הזדמנויות ויכינו תוכן להפצה. מתחילים בקטן, מודדים הכול, ומקדמים רק מה שבאמת עובד.</p>
            <div className="dp-hero-actions"><button className="dp-primary" onClick={()=>{setView("explore");document.getElementById("products")?.scrollIntoView({behavior:"smooth"});}}>לגלות מוצרים <ArrowLeft size={18}/></button><button className="dp-outline" onClick={()=>setView("control")}>למרכז השליטה <LayoutDashboard size={18}/></button></div>
            <div className="dp-hero-foot"><ShieldCheck size={16}/> בלי מחירים מומצאים, בלי ביקורות מזויפות, בלי פרסום ללא אישור</div>
          </div>
          <div className="dp-hero-art" aria-hidden="true">
            <div className="dp-orbit dp-orbit-one"/><div className="dp-orbit dp-orbit-two"/>
            <div className="dp-float-card dp-card-top"><span>✨</span><div><strong>AI Product Scout</strong><small>מנוע גילוי מוצרים</small></div><CheckCircle2 size={18}/></div>
            <div className="dp-hero-orb"><div className="dp-hero-orb-inner"><Bot size={82} strokeWidth={1.2}/></div></div>
            <div className="dp-float-card dp-card-bottom"><span>📈</span><div><strong>לגלות. לבדוק. לשפר.</strong><small>מחברים נתונים להחלטות</small></div></div>
            <div className="dp-art-dot dot-a"/><div className="dp-art-dot dot-b"/>
          </div>
        </div>
      </section>

      <section className="dp-stats-strip"><div className="dp-container dp-stats-grid">
        <div><PackageSearch size={20}/><span>קטלוג API</span><strong>{snapshot.items.length} מוצרים</strong></div>
        <div><Bot size={20}/><span>AI אוטומטי</span><strong>טרם חובר</strong></div>
        <div><Megaphone size={20}/><span>ערוצי פרסום</span><strong>בהכנה</strong></div>
        <div><ShieldCheck size={20}/><span>קישורי קידום</span><strong>{snapshot.items.filter(p=>Boolean(p.affiliateUrl)).length} קישורים</strong></div>
      </div></section>

      {view==="explore" ? <LiveCatalog snapshot={snapshot}/> : <section className="dp-section dp-container" id="products">
        <div className="dp-section-heading"><div><span className="dp-kicker">MISSION CONTROL</span><h2>מרכז השליטה <span>✳</span></h2><p>מבט ברור על המערכת, חיבורים והמשימות הבאות. כל הנתונים למטה מייצגים מצב פיתוח, לא פעילות חיה.</p></div><button className="dp-primary dp-small" onClick={()=>setShowAdd(true)}><Plus size={17}/> הוספת מועמד</button></div>
        <AliExpressTester/>
        <div className="dp-control-grid"><div className="dp-panel dp-wide"><div className="dp-panel-heading"><h3><PackageSearch size={20}/> תור בדיקת מוצרים</h3><span>{unverified} ממתינים לאימות</span></div>{unverified===0?<div className="dp-blank"><ClipboardCheck size={35}/><strong>אין כרגע מועמדים לבדיקה</strong><p>הוסיפו קישור מוצר ראשון כדי לבחון את תהליך העבודה.</p></div>:candidates.filter(p=>p.status==="unverified").map(p=><div className="dp-queue-row" key={p.id}><span>📦</span><div><strong>{p.name}</strong><small>{p.category} · נוסף בדפדפן זה בלבד, ללא שמירה בשרת</small></div><span className="dp-pill amber">דורש אימות</span></div>)}</div>
        <div className="dp-panel"><div className="dp-panel-heading"><h3><Bot size={20}/> מצב הסוכנים</h3></div><div className="dp-agent-row"><PackageSearch/><div><strong>Product Scout</strong><small>API מחובר לבדיקה · תהליך אוטומטי טרם הופעל</small></div><CirclePause size={18}/></div><div className="dp-agent-row"><Sparkles/><div><strong>Content Studio</strong><small>ממתין לנתוני מוצרים</small></div><CirclePause size={18}/></div><div className="dp-agent-row"><TrendingUp/><div><strong>Growth Analyst</strong><small>ממתין לנתוני ביצועים</small></div><CirclePause size={18}/></div></div></div>
        <div className="dp-panel"><div className="dp-panel-heading"><h3><Megaphone size={20}/> ערוצי הפצה</h3><span>ללא פרסום אוטומטי</span></div><div className="dp-channel-grid">{channels.map(c=>{const Icon=c.icon;return <div className="dp-channel" key={c.name}><div className="dp-channel-icon"><Icon size={21}/></div><div><strong>{c.name}</strong><small>{c.label}</small></div><span className={`dp-status ${c.kind}`}>{c.kind==="ready"?"תצוגה":c.kind==="later"?"בהמשך":"לא מחובר"}</span></div>})}</div></div>
        <div className="dp-honesty"><ShieldCheck size={20}/><div><strong>מצב בטוח: אין פרסומים או עסקאות אוטומטיים.</strong><p>אימות מוצר, יצירת קישור שותפים, שמירה בשרת וחיבור ערוצים יופעלו רק לאחר הגדרה ובדיקה. מועמדים שמוסיפים כאן נשמרים רק בזיכרון העמוד.</p></div></div>
      </section>}

      <section className="dp-how" id="how"><div className="dp-container"><div className="dp-how-intro"><span className="dp-kicker">THE SMART ENGINE</span><h2>מהגילוי ועד הקליק.<br/><span>במסלול אחד חכם.</span></h2></div><div className="dp-step-grid"><div><span>01</span><PackageSearch size={26}/><h3>מגלים</h3><p>מייבאים מוצרים ממקור מורשה ומסננים לפי איכות והתאמה לקהל.</p></div><div><span>02</span><ShieldCheck size={26}/><h3>מאמתים</h3><p>בודקים מחירים, משלוח, זכאות לעמלה ונתונים חסרים.</p></div><div><span>03</span><Sparkles size={26}/><h3>יוצרים</h3><p>מכינים פוסטים ותוכן שימושי בכל פורמט מתאים.</p></div><div><span>04</span><TrendingUp size={26}/><h3>משפרים</h3><p>מודדים קליקים ועמלות ומשקיעים במה שעובד בפועל.</p></div></div></div></section>
    </main>
    <footer className="dp-footer"><div className="dp-container"><div className="dp-footer-brand"><span className="dp-logo-mark"><Zap size={18}/></span><strong>dealpilot</strong><span>למצוא חכם. לשתף נכון.</span></div><p>© {new Date().getFullYear()} DealPilot · סביבת פיתוח · המחשות בלבד</p></div></footer>

    {showAdd&&<div className="dp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><div className="dp-modal" role="dialog" aria-modal="true" aria-labelledby="dp-modal-title"><div className="dp-modal-head"><div><span className="dp-kicker">PRODUCT INTAKE</span><h2 id="dp-modal-title">הוספת מועמד לבדיקה</h2></div><button onClick={()=>setShowAdd(false)} aria-label="סגירה"><X size={22}/></button></div><p>הקישור לא יהפוך אוטומטית לקישור שותפים ולא יפורסם. כאן בודקים את זרימת העבודה בלבד.</p><form onSubmit={addCandidate}><label>שם מוצר<input required minLength={3} maxLength={90} value={name} onChange={e=>setName(e.target.value)} placeholder="לדוגמה: מארגן כבלים שולחני"/></label><label>קישור מוצר ב-AliExpress<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.aliexpress.com/item/..."/></label><label>קטגוריה<select value={addCategory} onChange={e=>setAddCategory(e.target.value as Exclude<Category,"הכול">)}>{categories.filter(c=>c!=="הכול").map(c=><option key={c}>{c}</option>)}</select></label>{message&&<div className="dp-form-error" role="alert">{message}</div>}<button type="submit" className="dp-primary">הוסף לתור המקומי <ArrowLeft size={17}/></button></form></div></div>}
  </div>;
}
