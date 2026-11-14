"use client";

import { useMemo, useState } from "react";
import { ArrowUpLeft, Search, ShieldCheck, ExternalLink } from "lucide-react";
import type { CatalogSnapshot } from "../lib/aliexpress/catalog";

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
  const categories=["הכול","בית וסדר","רכב ואביזרים"];
  const filtered=useMemo(()=>snapshot.items.filter(item=>(category==="הכול"||item.category===category)&&normalizeTerm(item.title).includes(normalizeTerm(query))),[snapshot.items,query,category]);
  return <section className="dp-section dp-container" id="products">
    <div className="dp-section-heading"><div>
      <span className="dp-kicker">LIVE PRODUCT DISCOVERY</span>
      <h2>מוצרים אמיתיים מ־AliExpress <span>✳</span></h2>
      <p>{snapshot.available ? `נמשכו ${snapshot.items.length} מוצרים מ־AliExpress. המחיר והזמינות עשויים להשתנות בחנות.` : "לא ניתן לטעון כרגע נתונים מ־AliExpress. לא מוצגים מוצרים או מחירים מומצאים."}</p>
    </div><span className="dp-pill amber">גרסת פיתוח · אין פרסום אוטומטי</span></div>
    <div className="dp-filter-bar">
      <div className="dp-categories">{categories.map(value=><button key={value} className={category===value?"selected":""} onClick={()=>setCategory(value)}>{value}</button>)}</div>
      <label className="dp-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="סנן את המוצרים שנמצאו" aria-label="חיפוש בקטלוג"/></label>
    </div>
    <div className="dp-products">{filtered.map(item=>{
      const link=item.affiliateUrl ?? item.productUrl;
      const amount=formatMoney(item.price,item.currency);
      return <article className="dp-product" key={item.id}>
        <div className="dp-product-visual sky">
          {item.image ? <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{height:"100%",width:"100%",objectFit:"contain",padding:12}}/> : <span className="dp-product-emoji" aria-label="אין תמונה">📦</span>}
          <span className="dp-demo-label">נתוני ספק · לא המלצה מאומתת</span>
        </div>
        <div className="dp-product-content">
          <div className="dp-product-category">{item.category}</div>
          <h3 lang="en" dir="auto" style={{fontSize:15,lineHeight:1.6}}>{item.title}</h3>
          <p>{item.orders !== null ? `מספר הזמנות שמדווח על ידי הספק: ${item.orders.toLocaleString("he-IL")}` : "כמות הזמנות לא זמינה"}</p>
          <div className="dp-product-bottom">
            <div><strong style={{display:"block",fontSize:17}}>{amount ?? "המחיר אינו זמין"}</strong>
            <small style={{display:"block",color:"#8493a1",fontSize:10}}>{item.affiliateUrl ? "קישור שהוחזר כקישור קידום · ייחוס עמלה טרם נבדק" : "לא הוחזר קישור שותפים"}</small></div>
            {link ? <a href={link} target="_blank" rel="noopener noreferrer sponsored" className="dp-product-arrow" aria-label={item.affiliateUrl?"פתיחת קישור הקידום":"פתיחת עמוד מוצר, ללא קישור שותפים"}><ExternalLink size={18}/></a> : <span className="dp-product-arrow disabled"><ArrowUpLeft size={18}/></span>}
          </div>
        </div>
      </article>;
    })}</div>
    {filtered.length===0&&<div className="dp-empty"><ShieldCheck size={28}/><h3>{snapshot.items.length?"לא נמצאו מוצרים בסינון הזה":"אין כרגע מוצרים להצגה"}</h3><p>{snapshot.available?"נסו חיפוש אחר או קטגוריה אחרת.":"אפשר לנסות שוב מאוחר יותר אחרי בדיקת ה־API."}</p></div>}
    <p className="dp-disclosure">גילוי נאות: קישורי קידום עשויים לזכות אותנו בעמלה ללא עלות נוספת עבורך. מחירים ומוצרים מבוססים על תשובת API וטרם אומתו ידנית; יש לבדוק מחיר, משלוח וזמינות באתר AliExpress לפני רכישה. אין להסתמך על הקטגוריות כהמלצת AI.</p>
  </section>;
}
