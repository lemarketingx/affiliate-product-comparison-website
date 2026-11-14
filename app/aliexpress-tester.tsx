"use client";
import { useState } from "react";
import { ExternalLink, LoaderCircle, Search, ShieldCheck } from "lucide-react";

type ApiProduct = {
  id: string; title: string; price: string | null; currency: string | null;
  image: string | null; productUrl: string | null; affiliateUrl: string | null;
  commissionRate: string | null; orders: number | null;
};
type ApiResponse = { ok: boolean; code?: string; products?: ApiProduct[]; affiliateTrackingConfigured?: boolean };
const messages:Record<string,string> = {
  ADMIN_TOKEN_NOT_CONFIGURED:"חסר DEALPILOT_ADMIN_TOKEN בסביבת Preview של Vercel.",
  UNAUTHORIZED:"מפתח המנהל אינו תקין.",
  CREDENTIALS_MISSING:"מפתחות AliExpress אינם זמינים בפריסה הנוכחית.",
  PROVIDER_UNREACHABLE:"לא ניתן להגיע כרגע לשירות AliExpress.",
  UNEXPECTED_RESPONSE_SHAPE:"התקבלה תשובה בפורמט לא צפוי. יש לבדוק את סוג ה-API וההרשאות.",
  MISSING_RESULT:"התקבלה תשובה חלקית מ-AliExpress.",
  INVALID_RESPONSE:"התקבלה תשובה לא תקינה.",
  INVALID_JSON:"תשובת השירות אינה JSON תקין.",
};
export default function AliExpressTester() {
  const [token,setToken]=useState("");
  const [keywords,setKeywords]=useState("home organizer");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<ApiResponse|null>(null);
  const [error,setError]=useState("");
  async function run(event:React.FormEvent) {
    event.preventDefault();
    setLoading(true);setError("");setResult(null);
    try {
      const response=await fetch("/api/dealpilot/products",{
        method:"POST",
        cache:"no-store",
        headers:{"Content-Type":"application/json","x-dealpilot-admin-token":token},
        body:JSON.stringify({keywords}),
      });
      const data=await response.json() as ApiResponse;
      if (!response.ok || !data.ok) {
        const code=data.code??"UNKNOWN";
        setError(messages[code]??(`שגיאת API: ${code}`));
      } else setResult(data);
    } catch {setError("הבקשה נכשלה. בדוק את כתובת ה-Preview ואת החיבור לרשת.");}
    finally {setLoading(false);}
  }
  return <section className="dp-panel" aria-label="בדיקת AliExpress API" style={{marginBottom:20}}>
    <div className="dp-panel-heading"><h3><Search size={20}/> בדיקת מוצרים אמיתיים מ-AliExpress</h3><span>גישה למנהל בלבד</span></div>
    <p style={{color:"#718299",fontSize:13,marginBottom:16}}>חיפוש חי בממשק השותפים. המוצרים לא נשמרים ולא מתפרסמים. אין להדביק כאן App Secret.</p>
    <form onSubmit={run} style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{flex:"1 1 210px",fontSize:12,fontWeight:700}}>מפתח בדיקת מנהל
        <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" required placeholder="DEALPILOT_ADMIN_TOKEN" style={{display:"block",width:"100%",marginTop:6,padding:12,border:"1px solid #dce5f0",borderRadius:10}}/>
      </label>
      <label style={{flex:"1 1 210px",fontSize:12,fontWeight:700}}>חיפוש מוצרים
        <input value={keywords} onChange={e=>setKeywords(e.target.value)} minLength={2} maxLength={60} required style={{display:"block",width:"100%",marginTop:6,padding:12,border:"1px solid #dce5f0",borderRadius:10}}/>
      </label>
      <button className="dp-primary dp-small" type="submit" disabled={loading}>{loading?<LoaderCircle size={17}/>:<Search size={17}/>} {loading?"בודק...":"בדוק חיבור"}</button>
    </form>
    {error&&<p role="alert" style={{marginTop:16,padding:12,background:"#fff0f2",borderRadius:10,color:"#9f273d"}}>{error}</p>}
    {result&&<div style={{marginTop:22}}>
      <p style={{color:"#248466",display:"flex",gap:8,alignItems:"center",marginBottom:14}}><ShieldCheck size={18}/> החיבור הצליח. נמצאו {result.products?.length??0} מוצרים.</p>
      {!result.affiliateTrackingConfigured&&<p style={{padding:11,borderRadius:10,background:"#fff5df",color:"#8b621f",marginBottom:14}}>לא הוגדר ALIEXPRESS_TRACKING_ID. אין להניח שקישור מוצר רגיל מזכה בעמלה. יש לבדוק קישורי שותפים בפועל.</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
        {(result.products??[]).map(p=><article key={p.id} style={{border:"1px solid #e5ebf2",borderRadius:13,overflow:"hidden",background:"#fff"}}>
          <div style={{background:"#f4f7fd",height:145,display:"grid",placeItems:"center",overflow:"hidden"}}>{p.image?<img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span>📦</span>}</div>
          <div style={{padding:13}}>
            <strong style={{display:"block",fontSize:13,minHeight:56}}>{p.title}</strong>
            <div style={{color:"#57708b",fontSize:12,marginTop:8}}>{p.price&&p.currency?`${p.price} ${p.currency}`:"מחיר לא זמין"}</div>
            <div style={{color:"#8b9bb0",fontSize:11,marginTop:3}}>עמלה: {p.commissionRate??"לא ידועה"}</div>
            {p.affiliateUrl?<a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored" style={{display:"inline-flex",gap:5,alignItems:"center",color:"#2869eb",fontSize:12,marginTop:10}}>קישור שותפים <ExternalLink size={13}/></a>:<span style={{display:"block",fontSize:11,color:"#b17d27",marginTop:10}}>קישור שותפים לא הוחזר</span>}
          </div>
        </article>)}
      </div>
    </div>}
  </section>;
}
