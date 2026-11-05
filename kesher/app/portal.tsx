"use client";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  LayoutDashboard, Users, ContactRound, Wallet, Megaphone, Settings2, Search, Bell,
  Plus, ArrowUpLeft, ArrowLeft, ChevronDown, ChevronRight, ChevronLeft, CalendarDays,
  Download, Link2, Copy, Check, Clock3, CircleHelp, Menu, X, Sparkles, TrendingUp,
  Phone, Mail, ShieldCheck, ExternalLink, LogOut, SlidersHorizontal, CheckCircle2,
  CircleDot, LoaderCircle, Eye, Send, UserPlus, FileText, 
} from "lucide-react";
import { demoData } from "../lib/demo";
import { STATUS, PURPOSE, DEFAULT_SETTINGS, normalizePhone, calculateCommission, partnerLead, csvCell, money, shortDate } from "../lib/domain";
import type { PortalData, Partner, Lead, LeadStatus, Settings, Purpose } from "../lib/domain";
import { Brand, Avatar, StatusBadge, Empty, Modal, CopyButton, PanelTitle, TextLink, copyText } from "./components";

type Page = "overview" | "leads" | "partners" | "commissions" | "marketing" | "settings";
type Notice = { message: string; error?: boolean };
const PAGE_LABEL: Record<Page, string> = { overview: "סקירה כללית", leads: "הפניות", partners: "שותפים", commissions: "עמלות", marketing: "כלי שיווק", settings: "הגדרות" };
const NAV = [
  { id: "overview" as Page, icon: LayoutDashboard }, { id: "leads" as Page, icon: ContactRound },
  { id: "partners" as Page, icon: Users }, { id: "commissions" as Page, icon: Wallet },
  { id: "marketing" as Page, icon: Megaphone },
];
const DAY = 86400000;
function age(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 60 ? "לפני " + minutes + " דקות" : minutes < 1440 ? "לפני " + Math.floor(minutes / 60) + " שעות" : shortDate(timestamp);
}
export default function Portal({ signedIn }: { signedIn: boolean }) {
  const [demo, setDemo] = useState<PortalData>(() => demoData());
  const [live, setLive] = useState<PortalData | null>(null);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [page, setPage] = useState<Page>("overview");
  const [previewPartner, setPreviewPartner] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"lead" | "partner" | "help" | "notifications" | "account" | "signin" | null>(null);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [commissionLead, setCommissionLead] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [days, setDays] = useState(30);
  const [origin, setOrigin] = useState("");
  const source = mode === "demo" ? demo : live ?? demo;
  const owner = source.user.role === "admin";
  const admin = owner && !previewPartner;
  const activePartner = source.partners.find(p => p.id === (previewPartner || source.user.partnerId));
  const visible = useMemo(() => admin ? source.leads : source.leads.filter(l => l.partnerId === activePartner?.id).map(partnerLead), [source.leads, admin, activePartner?.id]);
  const pending = source.partners.filter(p => p.status === "pending").length;
  const active = source.partners.filter(p => p.status === "active");
  const events = admin ? source.events : source.events.filter(e => e.partnerId === activePartner?.id);
  const partnerName = (id: string | null) => source.partners.find(p => p.id === id)?.name ?? "פנייה ישירה";
  const link = (p?: Partner) => p ? origin + "/r/" + p.code + (mode === "demo" ? "?demo=1&name=" + encodeURIComponent(p.name) : "") : "";
  const notify = (message: string, error = false) => setNotice({ message, error });
  function navigate(next: Page) { setPage(next); setMobileOpen(false); setSearch(""); setStatus("all"); setPartnerFilter("all"); }
  useEffect(() => { setOrigin(window.location.origin); try { if (signedIn && localStorage.getItem("kesher-mode") === "live") void loadLive(); } catch {} }, []);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(null), 4500); return () => clearTimeout(t); } }, [notice]);
  async function loadLive() {
    setBusy(true);
    try {
      const response = await fetch("/api/portal", { cache: "no-store" });
      const result = await response.json() as PortalData & { error?: string };
      if (response.status === 401) { setModal("signin"); return; }
      if (response.status === 428) { window.location.href = "/join"; return; }
      if (!response.ok) throw new Error(result.error || "הפעולה לא הושלמה.");
      setLive(result); setMode("live"); try { localStorage.setItem("kesher-mode", "live"); } catch {} setPreviewPartner(""); setPage("overview");
      notify("סביבת העבודה שלך מוכנה. נתוני ההדגמה נשארים בנפרד.");
    } catch (error) { notify(error instanceof Error ? error.message : "לא ניתן להתחבר כרגע.", true); }
    finally { setBusy(false); }
  }
  function demoMutation(action: string, p: Record<string, unknown>) {
    const next = structuredClone(demo), now = Date.now(), newId = () => crypto.randomUUID();
    const event = (label: string, leadId: string | null = null, partnerId: string | null = null) => next.events.unshift({ id: newId(), label, leadId, partnerId, createdAt: now });
    if (action === "addPartner") {
      if (next.partners.some(x => x.email === p.email)) throw new Error("כתובת הדוא״ל כבר רשומה.");
      const partner = { ...p, id: newId(), code: newId().replaceAll("-", "").slice(0, 10), status: "active", createdAt: now } as Partner;
      next.partners.unshift(partner); event("נוסף שותף: " + partner.name, null, partner.id);
    } else if (action === "addLead") {
      const phone = normalizePhone(String(p.phone));
      if (!phone) throw new Error("מספר הטלפון אינו תקין.");
      if (!p.consent) throw new Error("יש לאשר את מסירת הפרטים.");
      if (next.leads.some(x => x.phone === phone)) throw new Error("המספר כבר רשום במערכת.");
      const lead = { id: newId(), name: String(p.name), phone, purpose: p.purpose as Purpose, partnerId: (p.partnerId || activePartner?.id || null) as string | null, status: "new", notes: "", feeReceived: 0, commissionAmount: null, commissionStatus: "pending", source: "portal", consentAt: now, createdAt: now, updatedAt: now } as Lead;
      next.leads.unshift(lead); event("התקבלה הפניה חדשה: " + lead.name, lead.id, lead.partnerId);
    } else if (action === "partnerStatus") {
      const partner = next.partners.find(x => x.id === p.id)!; partner.status = p.status as Partner["status"];
      event("סטטוס השותף " + partner.name + " עודכן", null, partner.id);
    } else if (action === "saveSettings") {
      next.settings = p as Settings;
    } else {
      const lead = next.leads.find(x => x.id === p.id)!;
      if (action === "updateLead") {
        if (p.status === "paid" && Number(p.feeReceived) <= 0) throw new Error("יש להזין את שכר הטרחה שהתקבל.");
        if (lead.commissionStatus !== "pending" && p.status !== "paid") throw new Error("יש להסדיר תחילה את העמלה שאושרה.");
        if (p.status === "paid" && lead.status !== "paid" && lead.partnerId) lead.commissionAmount = calculateCommission(next.settings.commissionMode, next.settings.commissionValue, Number(p.feeReceived));
        Object.assign(lead, p, { updatedAt: now }); event(lead.name + ": " + STATUS[lead.status], lead.id, lead.partnerId);
      } else if (action === "commission") {
        if (p.status === "paid" && (lead.commissionStatus !== "approved" || p.amount !== lead.commissionAmount)) throw new Error("יש לאשר את הסכום לפני סימון התשלום.");
        lead.commissionAmount = Number(p.amount); lead.commissionStatus = p.status as Lead["commissionStatus"];
        event(lead.name + ": עודכן רישום העמלה", lead.id, lead.partnerId);
      }
    }
    setDemo(next);
  }
  async function mutate(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      if (mode === "demo") demoMutation(action, payload);
      else {
        const response = await fetch("/api/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
        const result = await response.json() as PortalData & { error?: string }; if (!response.ok) throw new Error(result.error || "הפעולה לא הושלמה.");
        const fresh = await fetch("/api/portal", { cache: "no-store" }); const data = await fresh.json() as PortalData & { error?: string };
        if (!fresh.ok) throw new Error(data.error || "הפעולה לא הושלמה."); setLive(data);
      }
      notify(mode === "demo" ? "עודכן במצב ההדגמה" : "השינויים נשמרו");
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : "השמירה נכשלה.", true); return false; }
    finally { setBusy(false); }
  }
  function exportCsv() {
    const filtered = filteredLeads();
    const rows = [["שם לקוח", "טלפון", "סוג פנייה", "שותף", "סטטוס", "תאריך", "עמלה בשקלים"], ...filtered.map(l => [l.name, l.phone, PURPOSE[l.purpose], partnerName(l.partnerId), STATUS[l.status], shortDate(l.createdAt), l.commissionAmount == null ? "טרם הוגדרה" : l.commissionAmount / 100])];
    const blob = new Blob(["\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "kesher-referrals.csv"; a.click(); URL.revokeObjectURL(url);
    notify("קובץ ההפניות יוצא בהצלחה");
  }
  function filteredLeads() {
    return visible.filter(l => (status === "all" || l.status === status) && (partnerFilter === "all" || l.partnerId === partnerFilter) && (!search || (l.name + l.phone + partnerName(l.partnerId)).includes(search)));
  }
  const periodLeads = visible.filter(l => l.createdAt >= Date.now() - days * DAY);
  const converted = periodLeads.filter(l => ["signed", "paid"].includes(l.status)).length;
  const unpaid = visible.filter(l => l.status === "paid" && l.partnerId && l.commissionStatus !== "paid");
  const currentLead = visible.find(l => l.id === selectedLead);
  const currentCommission = visible.find(l => l.id === commissionLead);
  const currentPartner = source.partners.find(p => p.id === selectedPartner);
  const periodLabel = days + " הימים האחרונים";
  const partnerPending = !admin && activePartner?.status === "pending";
  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-scrim" aria-label="סגירת תפריט" onClick={() => setMobileOpen(false)}/>}
    <aside className={"sidebar " + (mobileOpen ? "sidebar-open" : "")}>
      <a href="/" className="brand-link" aria-label="קשר, לעמוד הראשי"><Brand light name={source.settings.businessName}/></a>
      <div className="workspace-label"><span className="workspace-dot"/>{admin ? "סביבת ניהול" : "אזור השותפים"}<ChevronDown size={14}/></div>
      <span className="nav-caption">סביבת העבודה</span>
      <nav aria-label="ניווט ראשי">
        {NAV.filter(n => admin || n.id !== "partners").map(({ id, icon: Icon }) => <button key={id} className={"nav-item " + (page === id ? "nav-active" : "")} onClick={() => navigate(id)} aria-current={page === id ? "page" : undefined}><Icon size={19}/><span>{PAGE_LABEL[id]}</span>{id === "leads" && visible.filter(l => l.status === "new").length > 0 && <b>{visible.filter(l => l.status === "new").length}</b>}{id === "partners" && pending > 0 && <i className="tiny-dot"/>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-card"><span className="sidebar-card-icon"><Link2 size={20}/></span><h3>קשר קטן. הזדמנות גדולה.</h3><p>כל הפניה טובה מתחילה באדם שמכיר אדם.</p><button onClick={() => navigate("marketing")}>לכלי השיווק <ArrowUpLeft size={16}/></button></div>
        {admin && <button className={"nav-item " + (page === "settings" ? "nav-active" : "")} onClick={() => navigate("settings")}><Settings2 size={19}/><span>הגדרות המערכת</span></button>}
        <button className="nav-item" onClick={() => setModal("help")}><CircleHelp size={19}/><span>עזרה ומידע</span></button>
        <div className="sidebar-footer"><span className="small-logo">קשר</span><span>מחברים אנשים להזדמנויות</span><i/></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="פתיחת תפריט" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><span>סביבת עבודה</span><ChevronLeft size={13}/><strong>{PAGE_LABEL[page]}</strong></div>
        <div className="topbar-actions">
          <label className="header-search"><Search size={16}/><input placeholder="חיפוש הפניה או לקוח..." value={search} onChange={e => { setSearch(e.target.value); setPage("leads"); }} aria-label="חיפוש הפניה"/></label>
          <button className="icon-button notification-button" onClick={() => setModal("notifications")} aria-label="עדכונים אחרונים"><Bell size={19}/>{events.length > 0 && <i/>}</button>
          <span className="topbar-divider"/>
          <button className="user-button" onClick={() => setModal("account")}><Avatar name={activePartner?.name ?? source.user.name} small/><span>{activePartner?.name ?? source.user.name}<small>{admin ? "חשבון מנהל" : "חשבון שותף"}</small></span><ChevronDown size={14}/></button>
        </div>
      </header>
      <div className={"environment-bar " + (mode === "live" ? "environment-live" : "")}>
        <span><span className="environment-dot"/>{mode === "demo" ? "מצב הדגמה" : "סביבת העבודה שלך"}<span className="environment-detail">{mode === "demo" ? "נתונים לדוגמה בלבד · השינויים כאן אינם נשמרים בחשבון" : "הנתונים נשמרים בחשבון שלך"}</span></span>
        <div className="environment-actions">
          {owner && active.length > 0 && <label className="preview-select"><Eye size={14}/><select aria-label="בחירת תצוגה" value={previewPartner} onChange={e => { setPreviewPartner(e.target.value); setPage("overview"); }}><option value="">תצוגת מנהל</option>{active.map(p => <option value={p.id} key={p.id}>תצוגת שותף: {p.name}</option>)}</select><ChevronDown size={12}/></label>}
          <button disabled={busy} onClick={() => { if (mode === "demo") void loadLive(); else { setMode("demo"); setPreviewPartner(""); setPage("overview"); try { localStorage.setItem("kesher-mode", "demo"); } catch {} } }}>{busy ? <LoaderCircle size={13} className="spin"/> : mode === "demo" ? <ArrowUpLeft size={14}/> : <Eye size={14}/>} {mode === "demo" ? "לעבור לנתונים שלי" : "חזרה להדגמה"}</button>
        </div>
      </div>
      <main className="main-content">
        {partnerPending && <div className="callout"><Clock3 size={20}/><div><strong>בקשת ההצטרפות ממתינה לאישור</strong><p>הקישור האישי יופעל לאחר אישור מנהל המערכת.</p></div></div>}
        <div className="page-heading">
          <div><div className="eyebrow">{admin ? "בונים הצלחה, ביחד" : "השותפות שלך מתחילה כאן"}<span/></div><h1>{page === "overview" ? admin ? "כל הקשרים. תמונה אחת." : "ההפניות שלך, בדרך להצלחה." : PAGE_LABEL[page]}</h1><p>{page === "overview" ? "מבט ברור על ההפניות, השותפים וההזדמנויות שבדרך." : page === "leads" ? "מהשיחה הראשונה ועד ללקוח הבא. הכול מתועד כאן." : page === "partners" ? "האנשים שמחברים את העסק שלך להזדמנות הבאה." : page === "commissions" ? "מעקב מסודר אחרי זכאות, אישור ורישום תשלומים לשותפים." : page === "marketing" ? "הקישור, המילים והכלים שיעזרו לקשר הבא לקרות." : "הפרטים והכללים שמתאימים את המערכת לעסק שלך."}</p></div>
          <div className="heading-actions">{page === "overview" && <label className="date-select"><CalendarDays size={16}/><select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="תקופת הסקירה"><option value={7}>7 הימים האחרונים</option><option value={30}>30 הימים האחרונים</option><option value={90}>90 הימים האחרונים</option></select><ChevronDown size={13}/></label>}
            {page === "partners" ? <button className="btn btn-primary" onClick={() => setModal("partner")}><UserPlus size={17}/>הוספת שותף</button> : page !== "settings" && page !== "commissions" && <button className="btn btn-primary" disabled={partnerPending} onClick={() => setModal("lead")}><Plus size={18}/>הפניה חדשה</button>}
          </div>
        </div>
        {page === "overview" && <>
          <section className="stats-grid" aria-label="מדדי הפעילות">
            <Stat title="הפניות שהתקבלו" value={periodLeads.length} caption={periodLabel} icon={<ContactRound size={21}/>} color="purple" spark={Array.from({ length: 7 }, (_, i) => periodLeads.filter(l => l.createdAt >= Date.now() - (7 - i) * days / 7 * DAY && l.createdAt < Date.now() - (6 - i) * days / 7 * DAY).length)}/>
            <Stat title="ממתינות לשיחה ראשונה" value={visible.filter(l => l.status === "new").length} caption="כל הפניה היא הזדמנות חדשה" icon={<Phone size={20}/>} color="amber" action={() => { navigate("leads"); setStatus("new"); }}/>
            <Stat title="הפניות שהבשילו להסכם" value={converted} caption={periodLeads.length ? Math.round(converted / periodLeads.length * 100) + "% מההפניות בתקופה" : "כאן נמדוד את ההתקדמות"} icon={<CheckCircle2 size={21}/>} color="green"/>
            <Stat title={admin ? "שותפים פעילים" : "עמלות שממתינות לטיפול"} value={admin ? active.length : unpaid.length} caption={admin ? pending ? pending === 1 ? "בקשה אחת ממתינה לאישור" : pending + " בקשות ממתינות לאישור" : "האנשים שמקדמים את העסק" : "יופיעו לאחר קבלת תשלום מלקוח"} icon={admin ? <Users size={21}/> : <Wallet size={21}/>} color="blue" action={() => navigate(admin ? "partners" : "commissions")}/>
          </section>
          <div className="dashboard-main-grid">
            <section className="panel chart-panel">
              <PanelTitle title="קשרים שהופכים להזדמנויות" subtitle="הפניות שהתקבלו וההתקדמות שלהן להסכם" action={<span className="quiet-badge">{periodLabel}</span>}/>
              <ActivityChart leads={periodLeads} days={days}/>
            </section>
            <section className="panel pipeline-panel"><PanelTitle title="איפה עומדות ההפניות?" subtitle="כל ההפניות לפי השלב הנוכחי"/>
              <div className="pipeline-list">{(Object.keys(STATUS) as LeadStatus[]).map((s, i) => { const count = visible.filter(l => l.status === s).length; return <button key={s} onClick={() => { navigate("leads"); setStatus(s); }} className="pipeline-row"><span className={"pipeline-marker marker-" + s}>{i + 1}</span><div><span>{STATUS[s]}</span><div className="progress-track"><i className={"fill-" + s} style={{ width: Math.max(visible.length ? count / visible.length * 100 : 0, count ? 5 : 0) + "%" }}/></div></div><strong>{count}</strong></button>; })}</div>
              <div className="pipeline-total"><span>סך כל ההפניות</span><strong>{visible.length}</strong></div>
            </section>
          </div>
          <div className="dashboard-lower-grid">
            <section className="panel recent-panel"><PanelTitle title="הקשרים האחרונים" subtitle="כל עדכון קטן מקרב לעסקה הבאה" action={<TextLink onClick={() => navigate("leads")}>לכל ההפניות</TextLink>}/><LeadTable leads={visible.slice(0, 5)} partners={source.partners} admin={admin} onOpen={setSelectedLead} compact/></section>
            <section className="panel partners-summary"><PanelTitle title={admin ? "השותפים שמניעים קדימה" : "הקישור האישי שלך"} subtitle={admin ? "לפי מספר ההפניות הכולל" : "שיתוף אחד יכול לפתוח דלת חדשה"} action={admin ? <button className="icon-button" aria-label="לכל השותפים" onClick={() => navigate("partners")}><ArrowUpLeft size={18}/></button> : undefined}/>
              {admin ? <div className="top-partners">{[...source.partners].sort((a, b) => visible.filter(l => l.partnerId === b.id).length - visible.filter(l => l.partnerId === a.id).length).slice(0, 4).map((p, i) => <button key={p.id} onClick={() => setSelectedPartner(p.id)}><Avatar name={p.name} index={i}/><span>{p.name}<small>{p.profession}</small></span><strong>{visible.filter(l => l.partnerId === p.id).length}<small>הפניות</small></strong></button>)}{!source.partners.length && <Empty title="נכיר את השותף הראשון?" text="אפשר להוסיף שותף ולהפיק לו קישור אישי." action={<button className="btn btn-light" onClick={() => setModal("partner")}>הוספת שותף</button>}/>}</div>
                : activePartner && <div className="personal-link-card"><div className="link-illustration"><Link2 size={40}/><i/><b/></div><p>הלקוחות שיגיעו דרך הקישור הזה<br/>ישויכו אליך אוטומטית.</p><div className="link-value" dir="ltr">{link(activePartner)}</div><CopyButton text={link(activePartner)} onCopied={notify} primary/></div>}
              {admin && active.length > 0 && <div className="summary-footer"><span><span className="online-dot"/>{active.length} שותפים פעילים</span><TextLink onClick={() => navigate("partners")}>ניהול שותפים</TextLink></div>}
            </section>
          </div>
          <div className="next-step-banner"><span className="next-step-icon"><Sparkles size={23}/></span><div><strong>{admin ? "הקשר הבא כבר בדרך." : "מכירים מישהו שמתכנן משכנתה?"}</strong><p>{admin ? "תנו לשותפים שלכם את הכלים להפוך היכרות להזדמנות." : "הקישור האישי והנוסחים המוכנים מחכים לכם בכלי השיווק."}</p></div><button className="btn btn-light" onClick={() => navigate("marketing")}>לכלי השיווק<ArrowUpLeft size={16}/></button><span className="banner-decoration" aria-hidden="true">↗</span></div>
        </>}
        {page === "leads" && <section className="panel full-panel">
          <div className="table-toolbar"><div className="filter-tabs">{[{ key: "all", label: "כל ההפניות" }, { key: "new", label: "חדשות" }, { key: "meeting", label: "פגישות" }, { key: "signed", label: "הסכמים" }, { key: "paid", label: "לקוחות משלמים" }].map(t => <button key={t.key} onClick={() => setStatus(t.key)} className={status === t.key ? "filter-active" : ""}>{t.label}<span>{t.key === "all" ? visible.length : visible.filter(l => l.status === t.key).length}</span></button>)}</div><button className="btn btn-light btn-small" onClick={exportCsv}><Download size={15}/>ייצוא CSV</button></div>
          <div className="table-filters"><label className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם, טלפון או שותף" aria-label="חיפוש בטבלה"/></label><label className="select-field"><SlidersHorizontal size={15}/><select value={status} onChange={e => setStatus(e.target.value)} aria-label="סינון לפי סטטוס"><option value="all">כל הסטטוסים</option>{Object.entries(STATUS).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select></label>{admin && <select className="simple-select" aria-label="סינון לפי שותף" value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}><option value="all">כל השותפים</option>{source.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
          <LeadTable leads={filteredLeads()} partners={source.partners} admin={admin} onOpen={setSelectedLead} paginate/>
        </section>}
        {page === "partners" && admin && <>
          <div className="mini-stat-row"><div><span className="mini-icon purple"><Users size={19}/></span><strong>{source.partners.length}</strong><span>שותפים בתוכנית</span></div><div><span className="mini-icon green"><CheckCircle2 size={19}/></span><strong>{active.length}</strong><span>פעילים ומחברים</span></div><div><span className="mini-icon amber"><Clock3 size={19}/></span><strong>{pending}</strong><span>ממתינים לאישור</span></div></div>
          <section className="panel full-panel"><PanelTitle title="השותפים שלך" subtitle="פרטי קשר, קישורים אישיים ומעקב פעילות" action={<CopyButton text={origin + "/join"} label="העתקת קישור הצטרפות" onCopied={notify}/>}/>
            {source.partners.length ? <div className="table-scroll"><table><thead><tr><th>שותף</th><th>תחום פעילות</th><th>הפניות</th><th>לקוחות משלמים</th><th>סטטוס</th><th>קישור אישי</th><th><span className="sr-only">פעולות</span></th></tr></thead><tbody>{source.partners.map((p, i) => <tr key={p.id}><td><button className="person-cell" onClick={() => setSelectedPartner(p.id)}><Avatar name={p.name} index={i}/><span>{p.name}<small dir="ltr">{p.email}</small></span></button></td><td>{p.profession}</td><td className="numeric">{source.leads.filter(l => l.partnerId === p.id).length}</td><td className="numeric">{source.leads.filter(l => l.partnerId === p.id && l.status === "paid").length}</td><td><span className={"partner-status partner-" + p.status}><i/>{p.status === "active" ? "פעיל" : p.status === "pending" ? "ממתין לאישור" : "מושהה"}</span></td><td>{p.status === "active" ? <button className="text-link" onClick={async () => { try { await copyText(link(p)); notify("הקישור האישי הועתק"); } catch { notify("לא ניתן להעתיק כרגע.", true); } }}><Link2 size={15}/>העתקת קישור</button> : <span className="muted">לא פעיל</span>}</td><td><button className="icon-button" onClick={() => setSelectedPartner(p.id)} aria-label={"ניהול השותף " + p.name}><ArrowUpLeft size={17}/></button></td></tr>)}</tbody></table></div> : <Empty title="נבנה את רשת השותפים שלך" text="הוסיפו שותף ראשון או העתיקו את קישור ההצטרפות." action={<button className="btn btn-primary" onClick={() => setModal("partner")}><Plus size={16}/>הוספת שותף ראשון</button>}/>}
          </section>
        </>}
        {page === "commissions" && <>
          {source.settings.commissionMode === "unset" && <div className="callout neutral-callout"><Wallet size={22}/><div><strong>גובה העמלה ייקבע בהמשך</strong><p>אפשר לקלוט הפניות ולעקוב אחר לקוחות כבר עכשיו. לא מחושבות עמלות אוטומטיות בשלב זה.</p></div>{admin && <button className="text-link" onClick={() => navigate("settings")}>להגדרות<ArrowUpLeft size={15}/></button>}</div>}
          <div className="mini-stat-row"><div><span className="mini-icon amber"><Clock3 size={19}/></span><strong>{unpaid.filter(l => l.commissionAmount == null).length}</strong><span>ממתינות להגדרת סכום</span></div><div><span className="mini-icon purple"><Wallet size={19}/></span><strong>{visible.some(l => l.commissionAmount != null && l.commissionStatus !== "paid") ? money(unpaid.reduce((s, l) => s + (l.commissionAmount ?? 0), 0)) : "—"}</strong><span>עמלות שהוגדרו וטרם שולמו</span></div><div><span className="mini-icon green"><CheckCircle2 size={19}/></span><strong>{visible.filter(l => l.commissionStatus === "paid").length}</strong><span>עמלות שסומנו כשולמו</span></div></div>
          <section className="panel full-panel"><PanelTitle title="ריכוז עמלות" subtitle="התשלום לשותף מתבצע מחוץ למערכת; כאן מתעדים את האישור והתשלום."/>
            {visible.some(l => l.status === "paid" && l.partnerId) ? <div className="table-scroll"><table><thead><tr><th>לקוח</th>{admin && <th>שותף</th>}<th>סכום עמלה</th><th>מצב העמלה</th><th>עודכן</th>{admin && <th>טיפול</th>}</tr></thead><tbody>{visible.filter(l => l.status === "paid" && l.partnerId).map(l => <tr key={l.id}><td><strong>{l.name}</strong><small className="cell-small">{PURPOSE[l.purpose]}</small></td>{admin && <td>{partnerName(l.partnerId)}</td>}<td>{l.commissionAmount == null ? <span className="muted">טרם הוגדרה</span> : <strong>{money(l.commissionAmount)}</strong>}</td><td><span className={"ledger-status ledger-" + l.commissionStatus}>{l.commissionAmount == null ? "ממתינה להגדרה" : l.commissionStatus === "approved" ? "אושרה לתשלום" : l.commissionStatus === "paid" ? "סומנה כשולמה" : "ממתינה לאישור"}</span></td><td>{shortDate(l.updatedAt)}</td>{admin && <td>{l.commissionStatus === "paid" ? <Check size={17} className="green-text"/> : <button className="text-link" onClick={() => setCommissionLead(l.id)}>{l.commissionAmount == null ? "הגדרת עמלה" : "טיפול בעמלה"}<ArrowUpLeft size={15}/></button>}</td>}</tr>)}</tbody></table></div> : <Empty title="העמלות יתחילו להצטבר כאן" text="כשיתקבל תשלום מלקוח שהגיע דרך שותף, ההפניה תופיע בריכוז."/>}
          </section>
        </>}
        {page === "marketing" && <Marketing partners={admin ? active : activePartner ? [activePartner] : []} link={link} notify={notify} settings={source.settings} demo={mode === "demo"}/>}
        {page === "settings" && admin && <SettingsForm settings={source.settings} busy={busy} onSave={p => mutate("saveSettings", p)} notify={notify} origin={origin}/>}
        <footer className="main-footer"><span><ShieldCheck size={14}/>קשר · מחברים אנשים להזדמנויות</span><span>{mode === "demo" ? "תצוגה להמחשה · פרטי האנשים בדויים" : "סביבת עבודה אישית"}<i/>גרסה ראשונה</span></footer>
      </main>
    </div>
    {notice && <div className={"toast " + (notice.error ? "toast-error" : "")} role="status">{notice.error ? <CircleHelp size={18}/> : <CheckCircle2 size={18}/>}<span>{notice.message}</span><button onClick={() => setNotice(null)} aria-label="סגירת הודעה"><X size={15}/></button></div>}
    {modal === "lead" && <Modal title="הפניה חדשה" subtitle="כל קשר חדש הוא התחלה של הזדמנות." onClose={() => setModal(null)}><LeadForm partners={active} admin={admin} busy={busy} onSave={async p => { if (await mutate("addLead", p)) setModal(null); }}/></Modal>}
    {modal === "partner" && <Modal title="נעים להכיר, שותף חדש" subtitle="השותף יקבל קישור אישי ומקום מסודר למעקב." onClose={() => setModal(null)}><PartnerForm busy={busy} onSave={async p => { if (await mutate("addPartner", p)) setModal(null); }}/></Modal>}
    {currentLead && <Modal title={currentLead.name} subtitle={PURPOSE[currentLead.purpose] + " · התקבלה ב־" + shortDate(currentLead.createdAt)} onClose={() => setSelectedLead(null)} wide><LeadDetails lead={currentLead} admin={admin} partnerName={partnerName(currentLead.partnerId)} events={events.filter(e => e.leadId === currentLead.id)} busy={busy} demo={mode === "demo"} onSave={async p => { if (await mutate("updateLead", p)) setSelectedLead(null); }}/></Modal>}
    {currentCommission && <Modal title="טיפול בעמלת שותף" subtitle={currentCommission.name + " · " + partnerName(currentCommission.partnerId)} onClose={() => setCommissionLead(null)}><CommissionForm lead={currentCommission} busy={busy} onSave={async p => { if (await mutate("commission", p)) setCommissionLead(null); }}/></Modal>}
    {currentPartner && <Modal title={currentPartner.name} subtitle={currentPartner.profession} onClose={() => setSelectedPartner(null)}>
      <div className="partner-profile"><Avatar name={currentPartner.name}/><div><strong>{currentPartner.name}</strong><span dir="ltr">{currentPartner.email}</span><span dir="ltr">{currentPartner.phone}</span></div></div>
      <div className="partner-profile-stats"><div><strong>{source.leads.filter(l => l.partnerId === currentPartner.id).length}</strong><span>הפניות</span></div><div><strong>{source.leads.filter(l => l.partnerId === currentPartner.id && l.status === "paid").length}</strong><span>לקוחות משלמים</span></div><div><strong>{shortDate(currentPartner.createdAt)}</strong><span>הצטרפות לתוכנית</span></div></div>
      {currentPartner.status === "active" && <div className="form-link-box"><label>הקישור האישי</label><div className="link-value" dir="ltr">{link(currentPartner)}</div><div className="button-row"><CopyButton text={link(currentPartner)} onCopied={notify}/><a className="btn btn-light" href={link(currentPartner)} target="_blank" rel="noreferrer"><ExternalLink size={15}/>תצוגת דף הפנייה</a></div></div>}
      <label className="form-field">סטטוס השותף<select value={currentPartner.status} disabled={busy} onChange={e => mutate("partnerStatus", { id: currentPartner.id, status: e.target.value })}><option value="active">פעיל</option><option value="pending">ממתין לאישור</option><option value="paused">מושהה</option></select></label>
      <p className="form-hint">השהיה עוצרת קליטת פניות חדשות דרך הקישור. ההפניות הקיימות נשמרות.</p>
      <button className="btn btn-primary full-width" onClick={() => { setPartnerFilter(currentPartner.id); setSelectedPartner(null); setPage("leads"); }}>לכל ההפניות של השותף<ArrowLeft size={16}/></button>
    </Modal>}
    {modal === "notifications" && <Modal title="מה חדש בקשרים שלך?" subtitle="העדכונים האחרונים במערכת" onClose={() => setModal(null)}><div className="activity-list">{events.slice(0, 12).map(e => <button key={e.id} onClick={() => { if (e.leadId) { setSelectedLead(e.leadId); setModal(null); } }}><span className="activity-icon"><CircleDot size={17}/></span><span>{e.label}<small>{age(e.createdAt)}</small></span>{e.leadId && <ArrowUpLeft size={15}/>}</button>)}{!events.length && <Empty title="כאן יופיעו העדכונים" text="קליטת הפניות ושינויי סטטוס יתועדו כאן."/ >}</div></Modal>}
    {modal === "help" && <Modal title="טוב שיש קשר" subtitle="איך עובדים עם המערכת?" onClose={() => setModal(null)}><div className="help-steps">{[["מוסיפים שותף", "המנהל מוסיף שותף או מאשר בקשת הצטרפות."], ["משתפים את הקישור האישי", "הלקוח ממלא את פרטיו ומשויך לשותף שהפנה אותו."], ["מקדמים את ההפניה", "המנהל מעדכן את שלב הטיפול והשותף יכול לעקוב."], ["מתעדים את העמלה", "אחרי גבייה מהלקוח, המנהל מגדיר או מאשר את העמלה ורושם את תשלומה."]].map(([title, text], i) => <div key={title}><b>{i + 1}</b><span><strong>{title}</strong><p>{text}</p></span></div>)}</div><div className="callout neutral-callout"><Eye size={19}/><p>במצב הדגמה אפשר להתנסות בלי לשנות את הנתונים בחשבון. לעבודה אמיתית לחצו על ״לעבור לנתונים שלי״.</p></div></Modal>}
    {modal === "account" && <Modal title="החשבון שלך" onClose={() => setModal(null)}><div className="partner-profile"><Avatar name={source.user.name}/><div><strong>{source.user.name}</strong><span>{source.user.role === "admin" ? "מנהל המערכת" : "שותף בתוכנית"}</span><span dir="ltr">{source.user.email}</span></div></div><p className="form-hint">הכניסה לחשבון מתבצעת באמצעות ChatGPT. נתוני השותפים מופרדים לפי החשבון המחובר.</p>{mode === "demo" ? <button className="btn btn-primary full-width" onClick={() => { setModal(null); loadLive(); }}>כניסה לחשבון שלי<ArrowUpLeft size={16}/></button> : <a className="btn btn-light full-width" href="/signout-with-chatgpt?return_to=/" target="_top"><LogOut size={16}/>יציאה מהחשבון</a>}</Modal>}
    {modal === "signin" && <Modal title="מכאן עוברים לעבודה אמיתית" subtitle="הנתונים שלך יישמרו בחשבון אישי." onClose={() => setModal(null)}><div className="signin-content"><ShieldCheck size={42}/><p>התחברו באמצעות ChatGPT כדי ליצור שותפים, לקלוט הפניות ולשמור את ההתקדמות.</p><a className="btn btn-primary full-width" href="/signin-with-chatgpt?return_to=/" target="_top">כניסה עם ChatGPT<ArrowUpLeft size={17}/></a><small>{signedIn ? "אם החיבור הסתיים, התחברו מחדש." : "ההדגמה זמינה גם בלי להתחבר."}</small></div></Modal>}
  </div>;
}

function Stat({ title, value, caption, icon, color, spark, action }: { title: string; value: number | string; caption: string; icon: React.ReactNode; color: string; spark?: number[]; action?: () => void }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className={"stat-icon " + color}>{icon}</span></div><div className="stat-value">{value}{spark && <svg className="stat-spark" width="90" height="35" viewBox="0 0 90 35" aria-hidden="true"><path d={spark.map((v, i) => (i ? "L" : "M") + (1 + i * 88 / 6) + " " + (32 - v / Math.max(1, ...spark) * 28)).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}</div><div className="stat-caption"><span>{caption}</span>{action && <button aria-label={title} onClick={action}><ArrowUpLeft size={15}/></button>}</div></div>;
}
function ActivityChart({ leads, days }: { leads: Lead[]; days: number }) {
  const now = Date.now(), start = now - days * DAY, width = days * DAY / 6;
  const bins = Array.from({ length: 6 }, (_, i) => {
    const group = leads.filter(l => l.createdAt >= start + i * width && l.createdAt < start + (i + 1) * width);
    return { label: shortDate(start + (i + .5) * width), count: group.length, converted: group.filter(l => ["signed", "paid"].includes(l.status)).length };
  });
  const max = Math.max(4, ...bins.map(b => b.count));
  return <div className="chart-wrap"><div className="chart-legend"><span><i className="legend-purple"/>הפניות שהתקבלו</span><span><i className="legend-mint"/>מתוכן הבשילו להסכם</span></div><div className="bar-chart"><div className="chart-axis"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className="chart-plot"><div className="chart-grid"><i/><i/><i/></div><div className="chart-columns" dir="ltr">{bins.map((b, i) => <div className="chart-column" key={i}><div className="chart-bars" title={b.label + ": " + b.count + " הפניות, " + b.converted + " הבשילו להסכם"}><div className="bar bar-purple" style={{ height: b.count / max * 100 + "%" }}><span>{b.count}</span></div><div className="bar bar-mint" style={{ height: b.converted / max * 100 + "%" }}/></div><span className="chart-date" dir="rtl">{b.label}</span></div>)}</div></div></div></div>;
}
function LeadTable({ leads, partners, admin, onOpen, compact = false, paginate = false }: { leads: Lead[]; partners: Partner[]; admin: boolean; onOpen: (id: string) => void; compact?: boolean; paginate?: boolean }) {
  const [page, setPage] = useState(0), size = 9;
  const pages = Math.ceil(leads.length / size), safePage = Math.min(page, Math.max(0, pages - 1));
  const rows = paginate ? leads.slice(safePage * size, (safePage + 1) * size) : leads;
  if (!rows.length) return <Empty title="עדיין אין הפניות בתצוגה הזאת" text="אפשר לשנות את הסינון או להוסיף הפניה חדשה."/>;
  return <><div className="table-scroll"><table className={compact ? "compact-table" : ""}><thead><tr><th>לקוח</th>{!compact && <th>סוג פנייה</th>}{admin && <th>הגיע דרך</th>}<th>סטטוס</th><th>התקבלה</th><th><span className="sr-only">פתיחת הפניה</span></th></tr></thead><tbody>{rows.map((lead, i) => <tr key={lead.id}><td><button className="person-cell" onClick={() => onOpen(lead.id)}><span className={"client-avatar client-" + i % 4}>{lead.name[0]}</span><span>{lead.name}<small>{compact ? PURPOSE[lead.purpose] : <bdi>{lead.phone}</bdi>}</small></span></button></td>{!compact && <td>{PURPOSE[lead.purpose]}</td>}{admin && <td><span className="partner-inline"><i className={"partner-initial partner-initial-" + i % 4}>{(partners.find(p => p.id === lead.partnerId)?.name ?? "י")[0]}</i>{partners.find(p => p.id === lead.partnerId)?.name ?? "פנייה ישירה"}</span></td>}<td><StatusBadge status={lead.status}/></td><td className="date-cell">{shortDate(lead.createdAt)}</td><td><button className="icon-button row-open" onClick={() => onOpen(lead.id)} aria-label={"פתיחת ההפניה של " + lead.name}><ArrowUpLeft size={17}/></button></td></tr>)}</tbody></table></div>{paginate && <div className="pagination"><span>מציגים {safePage * size + 1}–{Math.min((safePage + 1) * size, leads.length)} מתוך {leads.length} הפניות</span><div><button className="icon-button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} aria-label="עמוד קודם"><ChevronRight size={17}/></button><span>{safePage + 1} / {pages}</span><button className="icon-button" disabled={safePage + 1 >= pages} onClick={() => setPage(p => p + 1)} aria-label="עמוד הבא"><ChevronLeft size={17}/></button></div></div>}</>;
}
function LeadForm({ partners, admin, busy, onSave }: { partners: Partner[]; admin: boolean; busy: boolean; onSave: (p: Record<string, unknown>) => void }) {
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); onSave({ name: fd.get("name"), phone: fd.get("phone"), purpose: fd.get("purpose"), partnerId: fd.get("partnerId") || null, consent: fd.get("consent") === "on" }); }
  return <form className="form-stack" onSubmit={submit}><label className="form-field">שם הלקוח<input name="name" placeholder="שם מלא" required minLength={2} maxLength={80} autoFocus/></label><label className="form-field">טלפון לחזרה<input name="phone" type="tel" dir="ltr" placeholder="050-000-0000" required/></label><div className="form-row"><label className="form-field">סוג פנייה<select name="purpose">{Object.entries(PURPOSE).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>{admin && <label className="form-field">שיוך לשותף<select name="partnerId"><option value="">פנייה ישירה</option>{partners.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}</div><label className="checkbox-field"><input type="checkbox" name="consent" required/><span>הלקוח הסכים למסירת פרטיו למשרד ייעוץ המשכנתאות לצורך יצירת קשר בנושא הפנייה.</span></label><p className="form-hint">המספר נבדק למניעת הפניות כפולות. השיוך לשותף נשמר עם קליטת ההפניה.</p><button disabled={busy} className="btn btn-primary full-width" type="submit">{busy ? <LoaderCircle size={16} className="spin"/> : <Plus size={17}/>}יצירת הפניה</button></form>;
}
function PartnerForm({ busy, onSave }: { busy: boolean; onSave: (p: Record<string, unknown>) => void }) {
  return <form className="form-stack" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); onSave(Object.fromEntries(f)); }}><label className="form-field">שם מלא<input name="name" placeholder="איך קוראים לשותף?" required minLength={2} maxLength={80} autoFocus/></label><div className="form-row"><label className="form-field">דוא״ל<input name="email" type="email" dir="ltr" placeholder="name@example.com" required maxLength={160}/></label><label className="form-field">טלפון<input name="phone" type="tel" dir="ltr" placeholder="050-000-0000" required/></label></div><label className="form-field">תחום פעילות<select name="profession"><option>תיווך נדל״ן</option><option>ייעוץ פיננסי</option><option>ראיית חשבון</option><option>עריכת דין</option><option>יצירת תוכן</option><option>לקוחות וחברים</option><option>אחר</option></select></label><div className="callout neutral-callout"><Link2 size={20}/><p>לאחר יצירת השותף יופק קישור אישי. הכניסה שלו לפורטל תתבצע באמצעות אותו דוא״ל בחשבון ChatGPT, לאחר השלמת ההצטרפות.</p></div><button className="btn btn-primary full-width" type="submit" disabled={busy}><UserPlus size={17}/>יצירת שותף וקישור אישי</button></form>;
}
function LeadDetails({ lead, admin, partnerName, events, busy, demo, onSave }: { lead: Lead; admin: boolean; partnerName: string; events: PortalData["events"]; busy: boolean; demo: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const [status, setStatus] = useState(lead.status);
  return <div className="lead-details-grid"><div><div className="lead-contact"><div><span><Phone size={15}/>טלפון</span>{admin && !demo ? <a href={"tel:" + lead.phone} dir="ltr">{lead.phone}</a> : <strong dir="ltr">{lead.phone}</strong>}</div><div><span><Users size={15}/>הגיע דרך</span><strong>{partnerName}</strong></div></div>{admin ? <form className="form-stack" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); onSave({ id: lead.id, status, notes: fd.get("notes"), feeReceived: Math.round(Number(fd.get("feeReceived") || 0) * 100) }); }}><label className="form-field">שלב הטיפול<select value={status} onChange={e => setStatus(e.target.value as LeadStatus)}>{Object.entries(STATUS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><label className="form-field">שכר טרחה שהתקבל בפועל (₪)<input type="number" name="feeReceived" step=".01" min={status === "paid" ? ".01" : "0"} required={status === "paid"} defaultValue={lead.feeReceived / 100} readOnly={lead.status === "paid"}/></label><label className="form-field">הערות פנימיות למנהל<textarea name="notes" rows={4} defaultValue={lead.notes} maxLength={4000} placeholder="פרטים חשובים להמשך הטיפול..."/></label><p className="form-hint"><ShieldCheck size={13}/>ההערות ושכר הטרחה גלויים למנהל בלבד.</p><button className="btn btn-primary full-width" disabled={busy}><Check size={16}/>שמירת עדכון</button></form> : <div className="partner-lead-summary"><StatusBadge status={lead.status}/><p>העדכונים בהפניה יופיעו כאן ברגע שהמשרד יקדם את הטיפול.</p><div><span>עמלת השותף</span><strong>{lead.commissionAmount == null ? "טרם הוגדרה" : money(lead.commissionAmount)}</strong></div></div>}</div><div className="timeline-panel"><h3>הסיפור של ההפניה</h3><div className="timeline"><div><i/><span>ההפניה נקלטה<small>{shortDate(lead.createdAt)}</small></span></div>{[...events].reverse().map(e => <div key={e.id}><i/><span>{e.label}<small>{age(e.createdAt)}</small></span></div>)}</div><p className="form-hint">הסכמה למסירת פרטים תועדה ב־{shortDate(lead.consentAt)}.</p></div></div>;
}
function CommissionForm({ lead, busy, onSave }: { lead: Lead; busy: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const [amount, setAmount] = useState(lead.commissionAmount == null ? "" : String(lead.commissionAmount / 100));
  const [status, setStatus] = useState(lead.commissionStatus);
  return <form className="form-stack" onSubmit={e => { e.preventDefault(); onSave({ id: lead.id, amount: Math.round(Number(amount) * 100), status }); }}><label className="form-field">סכום העמלה (₪)<input type="number" min="0" max="100000" step=".01" required value={amount} onChange={e => setAmount(e.target.value)} readOnly={lead.commissionStatus === "approved"}/></label><label className="form-field">מצב העמלה<select value={status} onChange={e => setStatus(e.target.value as Lead["commissionStatus"])}>{lead.commissionStatus === "pending" && <option value="pending">ממתינה לאישור</option>}<option value="approved">אושרה לתשלום</option>{lead.commissionStatus === "approved" && <option value="paid">סומנה כשולמה</option>}</select></label><div className="callout neutral-callout"><Wallet size={20}/><p>{status === "paid" ? "סמנו כשולמה רק אחרי שהעברתם את הכסף לשותף. פעולה זו נרשמת בהיסטוריית ההפניה." : "אישור העמלה מתעד את הזכאות. העברת הכסף מתבצעת בנפרד, מחוץ למערכת."}</p></div><button className="btn btn-primary full-width" disabled={busy}><Check size={16}/>שמירת רישום העמלה</button></form>;
}
function Marketing({ partners, link, notify, settings, demo }: { partners: Partner[]; link: (p?: Partner) => string; notify: (s: string) => void; settings: Settings; demo: boolean }) {
  const [selected, setSelected] = useState("");
  const partner = partners.find(p => p.id === selected) ?? partners[0];
  const templates = [
    { icon: Send, title: "הודעה אישית", tag: "WhatsApp", text: "היי! אם אתם מתכננים לקחת משכנתה או לבדוק מחזור, אפשר לקבוע שיחת היכרות עם " + settings.advisorName + ". השאירו פרטים כאן ויחזרו אליכם: " },
    { icon: Megaphone, title: "פוסט לרשתות החברתיות", tag: "Facebook · Instagram", text: "בדרך לדירה משלכם? לפני שמתקדמים למשכנתה, כדאי להבין את האפשרויות ואת ההחזר שמתאים לכם. לפרטים ולשיחת היכרות עם " + settings.advisorName + ": " },
    { icon: FileText, title: "הפניה מקצועית", tag: "דוא״ל · שותפים עסקיים", text: "בהמשך לשיחתנו, מצורף קישור להשארת פרטים אצל " + settings.advisorName + " בנושא ייעוץ משכנתאות. ניתן לפרט את סוג הפנייה ולקבל מענה ישירות מהמשרד: " },
  ];
  if (!partner) return <section className="panel"><Empty title="כלי השיווק יחכו לשותף הראשון" text="כדי להפיק קישור אישי, צריך להוסיף ולאשר שותף בתוכנית."/></section>;
  return <><section className="referral-link-panel"><div><span className="eyebrow">החיבור שלך להזדמנות הבאה</span><h2>קישור אחד. כל ההפניות משויכות.</h2><p>שתפו את הקישור האישי, והמערכת תדע ממי הגיע הלקוח.</p><label className="form-field marketing-partner-label">הקישור של<select value={partner.id} onChange={e => setSelected(e.target.value)}>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="referral-link-actions"><span className="link-bubble"><Link2 size={27}/></span><div className="link-value" dir="ltr">{link(partner)}</div><div className="button-row"><CopyButton text={link(partner)} onCopied={notify} primary/><a className="btn btn-light" target="_blank" rel="noreferrer" href={link(partner)}><ExternalLink size={16}/>תצוגת דף הפנייה</a></div></div></section><div className="section-heading"><h2>מילים שפותחות דלת</h2><p>נוסחים מוכנים להעתקה. אפשר להתאים אותם לקול האישי שלכם.</p></div><div className="marketing-grid">{templates.map(({ icon: Icon, title, tag, text }) => <section className="panel template-card" key={title}><span className="template-icon"><Icon size={22}/></span><span className="template-tag">{tag}</span><h3>{title}</h3><p>{text}<span className="template-url">{link(partner)}</span></p><CopyButton text={text + link(partner)} label="העתקת הנוסח" onCopied={notify}/></section>)}</div><div className="callout neutral-callout"><ShieldCheck size={21}/><div><strong>שומרים על אמון, בכל קשר</strong><p>אפשר להוסיף לנוסח: ״אם תבחרו בשירות, ייתכן שאקבל מהמשרד עמלת הפניה.״ אין להבטיח אישור משכנתה או חיסכון מסוים.</p></div></div>{demo && <p className="form-hint">קישורי ההדגמה מציגים טופס לדוגמה ואינם יוצרים פנייה אמיתית.</p>}</>;
}
function SettingsForm({ settings, busy, onSave, notify, origin }: { settings: Settings; busy: boolean; onSave: (p: Record<string, unknown>) => Promise<boolean>; notify: (s: string) => void; origin: string }) {
  const [rule, setRule] = useState(settings.commissionMode);
  return <div className="settings-layout"><form className="panel settings-form" onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); await onSave({ businessName: fd.get("businessName"), advisorName: fd.get("advisorName"), contactEmail: fd.get("contactEmail"), contactPhone: fd.get("contactPhone"), commissionMode: rule, commissionValue: rule === "unset" ? null : Math.round(Number(fd.get("commissionValue")) * 100) }); }}><PanelTitle title="הפרטים של העסק" subtitle="יופיעו במערכת ובדף הפנייה ללקוח"/><div className="form-stack settings-fields"><div className="form-row"><label className="form-field">שם המותג<input name="businessName" defaultValue={settings.businessName} minLength={2} maxLength={60} required/></label><label className="form-field">שם היועץ או המשרד<input name="advisorName" defaultValue={settings.advisorName} required minLength={2} maxLength={80}/></label></div><div className="form-row"><label className="form-field">דוא״ל ליצירת קשר<input name="contactEmail" type="email" dir="ltr" defaultValue={settings.contactEmail} placeholder="office@example.com"/></label><label className="form-field">טלפון המשרד<input name="contactPhone" type="tel" dir="ltr" defaultValue={settings.contactPhone} placeholder="050-000-0000"/></label></div><div className="form-separator"/><div className="settings-subheading"><span className="mini-icon purple"><Wallet size={21}/></span><div><h3>כלל עמלה להפניות עתידיות</h3><p>אפשר להשאיר ללא הגדרה ולהחליט על הסכומים בהמשך.</p></div></div><label className="form-field">אופן החישוב<select value={rule} onChange={e => setRule(e.target.value as Settings["commissionMode"])}><option value="unset">יוגדר בהמשך</option><option value="fixed">סכום קבוע לכל לקוח ששילם</option><option value="percentage">אחוז משכר הטרחה שנגבה</option></select></label>{rule !== "unset" && <label className="form-field">{rule === "fixed" ? "עמלה קבועה (₪)" : "אחוז משכר הטרחה (%)"}<input name="commissionValue" key={rule} type="number" required min="0" max={rule === "percentage" ? "100" : "100000"} step=".01" defaultValue={settings.commissionMode === rule && settings.commissionValue != null ? settings.commissionValue / 100 : ""}/></label>}<div className="callout neutral-callout"><Clock3 size={20}/><p>שינוי הכלל ישפיע רק על הפניות שיסומנו כמשלמות לאחר השינוי. עמלות קיימות יישארו כפי שתועדו, וניתן להגדירן ידנית.</p></div><div className="settings-save"><button className="btn btn-primary" disabled={busy}><Check size={16}/>שמירת הגדרות</button></div></div></form><div className="settings-side"><section className="panel"><PanelTitle title="צירוף שותפים" subtitle="קישור ההצטרפות לתוכנית שלך"/><div className="settings-side-content"><UserPlus size={28}/><p>השותף משלים הרשמה, ואתם מאשרים את ההצטרפות דרך מסך השותפים.</p><CopyButton text={origin + "/join"} label="העתקת קישור הצטרפות" onCopied={notify}/></div></section><section className="panel"><PanelTitle title="הפרדה בין החשבונות"/><div className="settings-side-content"><ShieldCheck size={28}/><p>שותף רואה רק את ההפניות והעמלות שמשויכות אליו. ניהול השותפים, ההערות ושכר הטרחה זמינים למנהל.</p></div></section></div></div>;
}
