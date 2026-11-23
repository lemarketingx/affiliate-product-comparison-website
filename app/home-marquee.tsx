"use client";
// Moving strip on the home page: real brand logos (only brands with listed products)
// and the provider's best sellers. Pure CSS motion; this component only adds the
// pause control WCAG 2.2.2 asks for. Reduced motion: no motion, the strip scrolls.
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useState, type ReactNode } from "react";

export type MarqueeItem = { key: string; href: string; label: string; node: ReactNode };

/** Seller pills have a 64px image and text, so 12 span a full desktop width.
 * Avoid doubling the image-heavy sellers row when exactly 12 items exist. */
const MIN_PER_TRACK = 12;

function Track({ items, copy }: { items: MarqueeItem[]; copy?: boolean }) {
  const reps = Math.max(1, Math.ceil(MIN_PER_TRACK / items.length));
  const all = Array.from({ length: reps }, (_, r) => items.map((it) => ({ it, r }))).flat();
  return (
    // The second copy only closes the loop visually: hidden from assistive tech and not focusable.
    <ul className="bl-marquee-track" aria-hidden={copy ? "true" : undefined} inert={copy ? true : undefined}>
      {all.map(({ it, r }) => {
        // Repeats inside the first track are visual filler too: one real link per item.
        const filler = copy || r > 0;
        return (
          <li key={it.key + "-" + r} aria-hidden={!copy && filler ? "true" : undefined}>
            <Link href={it.href} aria-label={it.label} tabIndex={filler ? -1 : undefined}>
              {it.node}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomeMarquee({ rows, label }: { rows: { key: string; items: MarqueeItem[]; reverse?: boolean }[]; label: string }) {
  const [paused, setPaused] = useState(false);
  const live = rows.filter((r) => r.items.length >= 4);
  if (!live.length) return null;
  return (
    <section className={"bl-marquee" + (paused ? " is-paused" : "")} aria-label={label}>
      {live.map((r) => (
        <div className={"bl-marquee-row" + (r.reverse ? " is-reverse" : "")} key={r.key} data-row={r.key}>
          <div className="bl-marquee-belt">
            <Track items={r.items} />
            <Track items={r.items} copy />
          </div>
        </div>
      ))}
      <button type="button" className="bl-marquee-pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? "הפעלת התנועה" : "עצירת התנועה"}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>
    </section>
  );
}
