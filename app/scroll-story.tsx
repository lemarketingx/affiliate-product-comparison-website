"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpLeft, Check, MoveDown, Search, ShieldCheck } from "lucide-react";
import ProductImage from "./product-image";

export type ScrollStoryProduct = {
  id: string;
  title: string;
  image: string;
  brand: string;
};

const steps = [
  {eyebrow:"01 / לגלות", title:"קודם מוצאים את המותג.", copy:"פחות חיפוש אינסופי. מתחילים ממותג מזוהה ומגיעים למוצרים מתוך הקטלוג, עם תמונות וקישורים לפרטים.", icon:Search},
  {eyebrow:"02 / להשוות", title:"מסתכלים מעבר לתמונה.", copy:"בדף המוצר רואים מחיר מדווח וזמן בדיקה, לצד חישוב עלויות יבוא כשיש נתונים מתאימים. אין הבטחות על הנחות שלא אומתו.", icon:ShieldCheck},
  {eyebrow:"03 / להחליט", title:"עוברים לקנייה כשמוכנים.", copy:"בודקים את הדגם, המוכר, המשלוח והמחיר הסופי ב־AliExpress לפני שמזמינים. האתר שלנו הוא שלב הבדיקה.", icon:Check},
] as const;

export default function ScrollStory({products}:{products:ScrollStoryProduct[]}) {
  const [active,setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement|null)[]>([]);
  const wrapRef = useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(!("IntersectionObserver" in window))return;
    const observer=new IntersectionObserver(entries=>{
      const candidates=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
      if(!candidates.length)return;
      const index=Number((candidates[0].target as HTMLElement).dataset.stepIndex);
      if(Number.isInteger(index))setActive(index);
    },{root:null,rootMargin:"-24% 0px -28% 0px",threshold:[0,.2,.4,.6,.8,1]});
    stepRefs.current.forEach(el=>{if(el)observer.observe(el)});
    return ()=>observer.disconnect();
  },[]);
  if(products.length<3)return null;
  return <section className="hotam-story" ref={wrapRef} aria-labelledby="hotam-story-heading">
    <div className="hotam-story-heading">
      <span className="hotam-story-kicker">כך קונים חכם</span>
      <h2 id="hotam-story-heading">מהגלילה הראשונה<br/><span>להחלטה הנכונה.</span></h2>
      <p>שלושה צעדים, בלי רעש ובלי קיצורי דרך.</p>
      <span className="hotam-story-scroll-hint"><MoveDown size={16} aria-hidden="true"/> גללו כדי לגלות</span>
    </div>
    <div className="hotam-story-stage">
      <div className="hotam-story-visual" aria-label="מוצרים אמיתיים מהקטלוג">
        <div className="hotam-story-progress" aria-hidden="true">{steps.map((_,i)=><span key={i} className={i===active?"is-active":""}/>)}</div>
        {products.slice(0,3).map((p,i)=><div key={p.id} className={"hotam-story-product"+(i===active?" is-active":"")} aria-hidden={i!==active}>
          <span className="hotam-story-brand" dir="auto">{p.brand}</span>
          <div className="hotam-story-photo"><ProductImage src={p.image} alt="" thumb lazy={i!==0} label={p.brand}/></div>
          <span className="hotam-story-product-title" dir="auto">{p.title}</span>
          <Link tabIndex={i===active?0:-1} href={"/products/"+p.id} className="hotam-story-open" aria-label={"לפרטי "+p.title}>לפרטי המוצר <ArrowUpLeft size={17} aria-hidden="true"/></Link>
        </div>)}
        <span className="hotam-story-index" aria-hidden="true">0{active+1} / 03</span>
      </div>
      <div className="hotam-story-steps">
        {steps.map((step,i)=>{
          const Icon=step.icon;
          return <div key={i} ref={el=>{stepRefs.current[i]=el}} data-step-index={i} className={"hotam-story-step"+(i===active?" is-active":"")}>
            <span className="hotam-story-count">{step.eyebrow}</span>
            <Icon size={27} aria-hidden="true"/>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
            {i===2&&<Link className="hotam-story-browse" href="/deals">לכל מוצרי המותגים <ArrowUpLeft size={18} aria-hidden="true"/></Link>}
          </div>;
        })}
      </div>
    </div>
    <p className="hotam-story-fine">המוצרים המוצגים נבחרים מהקטלוג הקיים. זיהוי מותג אינו אישור מקוריות; התמונה ותנאי המוצר כפופים למידע המוכר.</p>
  </section>;
}
