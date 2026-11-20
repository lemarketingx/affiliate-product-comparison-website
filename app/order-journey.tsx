"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpLeft, RotateCcw, ShoppingCart, Package, HandHeart } from "lucide-react";
import ProductImage from "./product-image";

type JourneyProduct={id:string;title:string;image:string;brand:string};
const labels=["נכנס לעגלה","נארז בחבילה","נמסר ללקוח"] as const;

export default function OrderJourney({product}:{product:JourneyProduct|null}){
  const [playing,setPlaying]=useState(false);
  const [run,setRun]=useState(0);
  const [stage,setStage]=useState(0);
  const [reduced,setReduced]=useState(false);
  const root=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync=()=>setReduced(preference.matches);
    sync(); preference.addEventListener("change",sync);
    return ()=>preference.removeEventListener("change",sync);
  },[]);
  useEffect(()=>{
    if(!product||reduced)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        setPlaying(true);
        observer.disconnect();
      }
    },{threshold:0.28});
    if(root.current)observer.observe(root.current);
    return ()=>observer.disconnect();
  },[product,reduced]);
  useEffect(()=>{
    if(!playing||reduced)return;
    setStage(0);
    const t1=window.setTimeout(()=>setStage(1),2700);
    const t2=window.setTimeout(()=>setStage(2),5300);
    return ()=>{window.clearTimeout(t1);window.clearTimeout(t2)};
  },[playing,run,reduced]);
  if(!product)return null;
  const restart=()=>{setStage(0);setRun(v=>v+1);setPlaying(true)};
  return <section ref={root} className="hotam-journey" aria-labelledby="hotam-journey-title">
    <div className="hotam-journey-copy">
      <span className="hotam-journey-kicker">מהבחירה ועד אליכם</span>
      <h2 id="hotam-journey-title">מוצאים. בוחרים.<br/><em>ומתרגשים לפתוח.</em></h2>
      <p>מסע קטן של מוצר: אל העגלה, לתוך החבילה, ועד לידיים שלכם.</p>
      <div className="hotam-journey-track" aria-label="שלבי האנימציה">
        {labels.map((label,i)=><span key={label} className={i===stage?"is-current":i<stage?"is-complete":""}><b>0{i+1}</b>{label}</span>)}
      </div>
      <div className="hotam-journey-actions">
        <button type="button" onClick={restart} className="hotam-journey-replay"><RotateCcw size={16} aria-hidden="true"/>הפעל שוב</button>
        <Link href="/deals" className="hotam-journey-link">גלו מוצרים <ArrowUpLeft size={16} aria-hidden="true"/></Link>
      </div>
      <small>אנימציה להמחשה בלבד. האתר מפנה לרכישה ב־AliExpress; זמני שילוח ומסירה תלויים במוכר ובחברת השילוח.</small>
    </div>
    <div className={"hotam-journey-scene"+(playing&&!reduced?" is-playing":"")} key={run} aria-label="אנימציה של מוצר הנכנס לעגלה, נארז ונמסר ללקוח">
      <div className="hotam-journey-glow"/>
      <div className="hotam-journey-orbit orbit-one"/>
      <div className="hotam-journey-orbit orbit-two"/>
      <div className="hotam-journey-cart">
        <svg viewBox="0 0 250 195" role="img" aria-label="עגלת קניות" fill="none">
          <path d="M20 23h27l29 112h123l29-85H57" stroke="#242439" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M81 119h124" stroke="#ff6644" strokeWidth="11" strokeLinecap="round"/>
          <path d="M89 59h119l-19 57H103z" fill="#fff" stroke="#ff6644" strokeWidth="5" strokeLinejoin="round"/>
          <circle cx="99" cy="162" r="14" fill="#26253A"/>
          <circle cx="185" cy="162" r="14" fill="#26253A"/>
          <circle cx="99" cy="162" r="5" fill="#fff"/><circle cx="185" cy="162" r="5" fill="#fff"/>
        </svg>
      </div>
      <div className="hotam-journey-product">
        <div className="hotam-journey-product-image"><ProductImage src={product.image} alt="" label={product.brand} thumb lazy={false}/></div>
      </div>
      <div className="hotam-journey-box">
        <svg viewBox="0 0 280 240" role="img" aria-label="חבילת משלוח" fill="none">
          <path d="M53 79 140 42l87 37-87 43z" fill="#F2C386" stroke="#B77B45" strokeWidth="4" strokeLinejoin="round"/>
          <path d="M53 79v104l87 42V122z" fill="#D89B61" stroke="#B77B45" strokeWidth="4" strokeLinejoin="round"/>
          <path d="M140 122v103l87-42V79z" fill="#E8B37C" stroke="#B77B45" strokeWidth="4" strokeLinejoin="round"/>
          <path d="m97 61 88 40-19 10-89-41z" fill="#FDF0D0" opacity=".94"/>
          <path d="m140 122 26-12v43l-26 13z" fill="#FBDFB0" opacity=".94"/>
          <path d="m94 160 33 16v29l-33-16z" fill="#fff" opacity=".93"/>
          <path d="m99 173 21 10m-21-3 14 7" stroke="#B9B0AA" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="hotam-journey-box-flap"/>
      </div>
      <div className="hotam-journey-hand">
        <svg viewBox="0 0 350 208" role="img" aria-label="יד מושטת לקבלת חבילה">
          <path d="M340 107c-39-3-83-2-113 7-21 6-37 7-55-5l-42-29c-13-9-28-6-36 5-7 10-3 23 8 32l38 34c-34 3-62 7-98 7-26 0-39 15-34 33 3 13 18 17 42 16l129-6c39-2 80-6 114-15l47 1z" fill="#F4BC95" stroke="#D99572" strokeWidth="5" strokeLinejoin="round"/>
          <path d="m159 155 55-1c19 0 24-14 14-23-6-6-15-8-24-8l-45-2" fill="none" stroke="#D99572" strokeWidth="4" strokeLinecap="round"/>
          <path d="M288 102h62v93h-62z" fill="#5C507D"/>
          <path d="M291 120h59" stroke="#8A7BAA" strokeWidth="6"/>
        </svg>
      </div>
      <div className="hotam-journey-complete"><span>✓</span>החבילה בידיים טובות</div>
      <div className="hotam-journey-stage-label" aria-live="off">{labels[stage]}</div>
      <span className="hotam-journey-spark spark-a">✦</span><span className="hotam-journey-spark spark-b">✳</span>
      <div className="hotam-journey-scene-footer"><ShoppingCart size={16}/><Package size={16}/><HandHeart size={16}/></div>
    </div>
  </section>;
}
