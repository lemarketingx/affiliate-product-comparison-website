"use client";
import { useEffect, useRef, useState } from "react";

import { thumbUrl } from "../lib/dealpilot/thumb";
export { thumbUrl };

/** Shown when a product image is missing or fails to load. Keeps the media box size. */
export function ImageFallback({ label, big = false }: { label?: string | null; big?: boolean }) {
  return (
    <span className={"bl-img-fallback" + (big ? " is-big" : "")} role="img" aria-label="תמונת המוצר אינה זמינה">
      <svg viewBox="0 0 48 48" width={big ? 56 : 36} height={big ? 56 : 36} aria-hidden="true" focusable="false">
        <rect x="5" y="9" width="38" height="30" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="17" cy="20" r="3.4" fill="currentColor" />
        <path d="M9 35l10-10 7 7 5-5 8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
      {label ? <b dir="auto">{label}</b> : null}
      <small>התמונה אינה זמינה כרגע</small>
    </span>
  );
}

/**
 * An <img> whose failure is caught even when it happened before hydration
 * (server-rendered images can error before React attaches onError).
 * `sources` are tried in order; when all fail, `onFail` fires once.
 */
export function useImageSource(sources: string[]) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const failed = index >= sources.length;
  const next = () => setIndex((i) => i + 1);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0 && el.getAttribute("src")) next();
  }, [index]);
  return { ref, src: failed ? null : sources[index], failed, onError: next };
}

export default function ProductImage({
  src,
  alt,
  lazy = true,
  width = 420,
  height = 360,
  thumb = false,
  label = null,
}: {
  src: string | null;
  alt: string;
  lazy?: boolean;
  width?: number;
  height?: number;
  thumb?: boolean;
  /** Brand name shown in the fallback, so a failed image still identifies the card. */
  label?: string | null;
}) {
  const candidates = !src ? [] : thumb && thumbUrl(src) !== src ? [thumbUrl(src), src] : [src];
  const img = useImageSource(candidates);
  if (img.failed) return <ImageFallback label={label} />;
  return (
    <img
      ref={img.ref}
      src={img.src ?? undefined}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={img.onError}
    />
  );
}
