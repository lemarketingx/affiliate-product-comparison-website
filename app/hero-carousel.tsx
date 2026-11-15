"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = {
  key: string;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  accent: string;
  images: string[];
  wordmark?: string;
};

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const n = slides.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!paused.current && document.visibilityState === "visible") setI((x) => (x + 1) % n);
    }, 6500);
    return () => clearInterval(t);
  }, [n]);
  return (
    <section
      className="og-carousel"
      aria-roledescription="קרוסלה"
      aria-label="מבצעים ומותגים"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      {slides.map((s, idx) => (
        <div
          key={s.key}
          className={"og-slide" + (idx === i ? " is-active" : "")}
          style={{ "--accent": s.accent } as React.CSSProperties}
          aria-hidden={idx !== i}
          role="group"
          aria-roledescription="שקופית"
          aria-label={idx + 1 + " מתוך " + n}
        >
          <div className="og-slide-copy">
            <span className="og-slide-kicker">{s.kicker}</span>
            {s.wordmark && (
              <span className="og-slide-word" dir="ltr">
                {s.wordmark}
              </span>
            )}
            <h2>{s.title}</h2>
            <p>{s.subtitle}</p>
            <Link className="og-btn og-btn-go" href={s.href} tabIndex={idx === i ? 0 : -1}>
              {s.cta} <ChevronLeft size={18} />
            </Link>
          </div>
          <div className={"og-slide-art n" + Math.min(s.images.length, 3)} aria-hidden="true">
            <span className="og-slide-glow" />
            {s.images.slice(0, 3).map((src, k) => (
              <span className={"og-slide-img k" + k} key={src}>
                <img src={src} alt="" referrerPolicy="no-referrer" loading={idx === 0 ? "eager" : "lazy"} />
              </span>
            ))}
          </div>
        </div>
      ))}
      {n > 1 && (
        <>
          <button className="og-car-btn prev" aria-label="השקופית הקודמת" onClick={() => go(i - 1)}>
            <ChevronRight size={22} />
          </button>
          <button className="og-car-btn next" aria-label="השקופית הבאה" onClick={() => go(i + 1)}>
            <ChevronLeft size={22} />
          </button>
          <div className="og-dots">
            {slides.map((s, idx) => (
              <button
                key={s.key}
                aria-label={"מעבר לשקופית " + (idx + 1)}
                aria-current={idx === i}
                onClick={() => go(idx)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
