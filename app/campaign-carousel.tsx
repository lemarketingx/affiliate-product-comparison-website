"use client";

import Link from "next/link";
import { ArrowUpLeft, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

export type PromoSlide = {
  key: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  notice: string;
  label: string;
  href: string;
  external: boolean;
  tone: "festival" | "midnight" | "emerald" | "ruby";
  images: string[];
};

export default function CampaignCarousel({ slides }: { slides: PromoSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length <= 1 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive(a => (a + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const slide = slides[Math.min(active, slides.length - 1)];
  const step = (dir: number) => setActive(a => (a + slides.length + dir) % slides.length);
  return (
    <section className="dpb-campaign-wrap" aria-label="מבצעים וקולקציות מתחלפים">
      <div className={"dpb-campaign dpb-campaign-" + slide.tone}>
        <div className="dpb-campaign-graphic" aria-hidden="true">
          <div className="dpb-orbit dpb-orbit-one" /><div className="dpb-orbit dpb-orbit-two" />
          <span className="dpb-star dpb-star-a">✦</span><span className="dpb-star dpb-star-b">✦</span>
          <div className="dpb-product-stage">
            {slide.images.slice(0, 3).map((src, index) => (
              <span className={"dpb-stage-item dpb-stage-item-" + index} key={src + index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              </span>
            ))}
            {!slide.images.length && <span className="dpb-stage-monogram">DP</span>}
          </div>
        </div>
        <div className="dpb-campaign-copy" key={slide.key}>
          <span className="dpb-campaign-kicker">{slide.eyebrow}</span>
          <h2>{slide.title}</h2>
          <p>{slide.subtitle}</p>
          {slide.external
            ? <a className="dpb-campaign-cta" href={slide.href} rel="sponsored noopener noreferrer" target="_blank">{slide.label} <ArrowUpLeft size={19} /></a>
            : <Link className="dpb-campaign-cta" href={slide.href}>{slide.label} <ArrowUpLeft size={19} /></Link>}
          <small>{slide.notice}</small>
        </div>
        {slides.length > 1 && <>
          <button type="button" className="dpb-carousel-prev" onClick={() => step(-1)} aria-label="לבאנר הקודם"><ChevronRight aria-hidden="true" /></button>
          <button type="button" className="dpb-carousel-next" onClick={() => step(1)} aria-label="לבאנר הבא"><ChevronLeft aria-hidden="true" /></button>
          <nav className="dpb-campaign-dots" aria-label="בחירת באנר">
            {slides.map((s, i) => <button type="button" key={s.key} aria-label={"מעבר לבאנר " + (i + 1)} aria-current={i === active ? "true" : undefined} onClick={() => setActive(i)} />)}
          </nav>
          <button type="button" className="dpb-carousel-pause" onClick={() => setPaused(p => !p)} aria-label={paused ? "הפעלת החלפה אוטומטית" : "עצירת החלפה אוטומטית"}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
        </>}
      </div>
    </section>
  );
}
