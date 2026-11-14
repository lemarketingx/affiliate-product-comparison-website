"use client";

import { useMemo, useState } from "react";
import { ArrowUpLeft, Search, ShieldCheck, ExternalLink } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";
import { assessProduct } from "../lib/aliexpress/scoring";

type Props = { snapshot: CatalogSnapshot };
function formatMoney(value: string | null, currency: string | null): string | null {
  if (value == null || !currency || !Number.isFinite(Number(value))) return null;
  try { return new Intl.NumberFormat("he-IL",{style:"currency",currency,maximumFractionDigits:2}).format(Number(value)); }
  catch { return value + " " + currency; }
}
function normalizeTerm(value: string) { return value.trim().toLocaleLowerCase(); }

export default function LiveCatalog({snapshot}:Props) {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("הכול");
  const [sort,setSort]=useState<"recommended"|"original">("recommended");
  const categories=["הכול","בית וסדר","רכב ואביזרים"];
  const filtered=useMemo(()=>{
    const items=snapshot.items.filter(item=>(category==="הכול"||item.category===category)&&normalizeTerm(item.title).includes(normalizeTerm(query)));
    return sort==="recommended" ? [...items].sort((a,b)=>assessProduct(b).score-assessProduct(a).score) : items;
  },[snapshot.items,query,category,sort]);
  return <section className="dp-section dp-container" id="products">
    <div className="dp-section-heading"><div>
      <span className="dp-kicker">LIVE PRODUCT DISCOVERY</span>
      <h2>מוצרים אמיתיים מ־AliExpress <span>✳</span></h2>
      <p>{snapshot.available ? `נמשכו ${snapshot.items.length} מוצרים מ־AliExpress. המחיר והזמינות עשויים להשתנות בחנות.` : "לא ניתן לטעון כרגע נתונים מ־AliExpress. לא מוצגים מוצרים או מחירים מומצאים."}</p>
    </div><span className="dp-pill amber">גרסת פיתוח · אין פרסום אוטומטי</span></div>
    <div className="dp-filter-bar">
      <div className="dp-categories">{categories.map(value=><button key={value} className={category===value?"selected":""} onClick={()=>setCategory(value)}>{value}</button>)}</div>
      <label className="dp-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="סנן את המוצרים שנמצאו" aria-label="חיפוש בקטלוג"/></label>
      <label className="dp-search" style={{minWidth:170}}><span className="dp-sr-only">סידור מוצרים</span><select aria-label="סידור מוצרים" value={sort} onChange={event=>setSort(event.target.value as "recommended"|"original")} style={{border:0,background:"transparent",width:"100%"}}><option value="recommended">דירוג מוכנות לבדיקה</option><option value="original">סדר מקורי</option></select></label>
    </div>
    <div className="dp-products">{filtered.map(item=>{
      const link=item.affiliateUrl ? "/go/"+encodeURIComponent(item.id)+"?source=catalog" : item.productUrl;
      const amount=formatMoney(item.price,item.currency);
      const assessment=assessProduct(item);
      return <article className="dp-product" key={item.id}>
        <div className="dp-product-visual sky">
          {item.image ? <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{height:"100%",width:"100%",objectFit:"contain",padding:12}}/> : <span className="dp-product-emoji" aria-label="אין תמונה">📦</span>}
          <span className="dp-demo-label">ציון בדיקה {assessment.score}/100 · לא תחזית מכירות</span>
        </div>
        <div className="dp-product-content">
          <div className="dp-product-category">{item.category}</div>
          <h3 lang="en" dir="auto" style={{fontSize:15,lineHeight:1.6}}>{item.title}</h3>
          <p>{item.orders !== null ? `מספר הזמנות שמדווח על ידי הספק: ${item.orders.toLocaleString("he-IL")}` : "כמות הזמנות לא זמינה"}</p>
          <p style={{fontSize:11,color:assessment.status==="review"?"#377d68":"#9b6d35",marginTop:7}}>{assessment.status==="review"?"נתונים בסיסיים זמינים · מחייב אישור אנושי":assessment.blockers.slice(0,2).join(" · ")}</p>
          <div className="dp-product-bottom">
            <div><strong style={{display:"block",fontSize:17}}>{amount ?? "המחיר אינו זמין"}</strong>
            <small style={{display:"block",color:"#8493a1",fontSize:10}}>{item.affiliateUrl ? "קישור שהוחזר כקישור קידום · ייחוס עמלה טרם נבדק" : "לא הוחזר קישור שותפים"}</small></div>
            {link ? <a href={link} target="_blank" rel="noopener noreferrer sponsored" className="dp-product-arrow" aria-label={item.affiliateUrl?"פתיחת קישור קידום דרך האתר":"פתיחת עמוד מוצר, ללא קישור שותפים"}><ExternalLink size={18}/></a> : <span className="dp-product-arrow disabled"><ArrowUpLeft size={18}/></span>}
          </div>
        </div>
      </article>;
    })}</div>
    {filtered.length===0&&<div className="dp-empty"><ShieldCheck size={28}/><h3>{snapshot.items.length?"לא נמצאו מוצרים בסינון הזה":"אין כרגע מוצרים להצגה"}</h3><p>{snapshot.available?"נסו חיפוש אחר או קטגוריה אחרת.":"אפשר לנסות שוב מאוחר יותר אחרי בדיקת ה־API."}</p></div>}
    <p className="dp-disclosure">גילוי נאות: קישורי קידום עשויים לזכות אותנו בעמלה ללא עלות נוספת עבורך. לחיצות על קישורי קידום עשויות להימדד באופן מצרפי כאשר מערכת המדידה מופעלת, ללא זיהוי אישי. מחירים ומוצרים מבוססים על תשובת API וטרם אומתו ידנית; יש לבדוק מחיר, משלוח וזמינות באתר AliExpress לפני רכישה. הציון הוא מדד שלמות נתונים וסימני עניין בלבד, לא הבטחה לרווחיות ולא דירוג איכות של המוכר. משלוח לישראל וייחוס עמלות טרם אומתו.</p>
  </section>;
}
