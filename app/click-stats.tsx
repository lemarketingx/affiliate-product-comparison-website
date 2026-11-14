"use client";
import { useState } from "react";
import { BarChart3, LoaderCircle } from "lucide-react";
type Stats = {ok:boolean;code?:string;trackingReady?:boolean;totalClicks?:number;bySource?:{source:string;clicks:number}[]};
export default function ClickStats() {
  const [token,setToken]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Stats|null>(null);
  const [error,setError]=useState("");
  async function load(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError("");setResult(null);
    try {
      const res=await fetch("/api/dealpilot/stats",{method:"POST",headers:{"x-dealpilot-admin-token":token},cache:"no-store"});
      const data=await res.json() as Stats;
      if (!res.ok||!data.ok) setError(data.code==="UNAUTHORIZED"?"מפתח מנהל שגוי":data.code??"שגיאת מדידה");
      else setResult(data);
    }catch{setError("לא ניתן לטעון את נתוני המדידה כרגע");}
    finally{setBusy(false);}
  }
  return <div className="dp-panel" style={{marginBottom:20}}>
    <div className="dp-panel-heading"><h3><BarChart3 size={20}/> מדידת קליקים</h3><span>נתוני אמת בלבד</span></div>
    <p style={{color:"#8192a3",fontSize:12,marginBottom:14}}>ספירת קליקים תתחיל רק לאחר חיבור מסד נתונים נפרד ל־DealPilot. אין עדיין מעקב רכישות או עמלות.</p>
    <form onSubmit={load} style={{display:"flex",flexWrap:"wrap",gap:12}}>
      <input type="password" autoComplete="off" aria-label="מפתח מנהל למדידה" placeholder="מפתח בדיקת מנהל" value={token} onChange={e=>setToken(e.target.value)} required style={{flex:"1 1 210px",padding:12,border:"1px solid #dce5f0",borderRadius:10}}/>
      <button className="dp-primary dp-small" type="submit" disabled={busy}>{busy?<LoaderCircle size={17}/>:<BarChart3 size={17}/>} הצג נתונים</button>
    </form>
    {error&&<p role="alert" style={{color:"#b42d48",marginTop:12}}>{error}</p>}
    {result&&<div style={{marginTop:16}}>
      {result.trackingReady ? <><strong>קליקים שנרשמו: {result.totalClicks??0}</strong><div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:10}}>{result.bySource?.map(row=><span key={row.source} className="dp-pill amber">{row.source}: {row.clicks}</span>)}</div></> : <p style={{color:"#a36a1b"}}>המדידה אינה מחוברת עדיין. לא ניתן להציג ספירת קליקים.</p>}
    </div>}
  </div>;
}
