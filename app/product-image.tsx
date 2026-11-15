"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
/** AliExpress CDN thumbnail (smaller transfer on mobile); falls back to the original. */
export function thumbUrl(src: string, size = 350): string {
  try {
    const u = new URL(src);
    if (!/(^|\.)alicdn\.com$/.test(u.hostname) || u.search || u.hash) return src;
    if (!/\.(jpe?g|png|webp)$/i.test(u.pathname) || /_\d+x\d+/.test(u.pathname)) return src;
    return src + `_${size}x${size}.jpg`;
  } catch {
    return src;
  }
}
export default function ProductImage({
  src,
  alt,
  lazy = true,
  width = 420,
  height = 360,
  thumb = false,
}: {
  src: string | null;
  alt: string;
  lazy?: boolean;
  width?: number;
  height?: number;
  thumb?: boolean;
}) {
  const [stage, setStage] = useState(0); // 0: thumbnail, 1: original, 2: failed
  const shown = src && thumb && stage === 0 ? thumbUrl(src) : src;
  if (!src || stage === 2)
    return (
      <span
        className="dp-image-fallback"
        role="img"
        aria-label="תמונת המוצר אינה זמינה"
      >
        <ImageOff size={36} />
      </span>
    );
  return (
    <img
      src={shown ?? undefined}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStage((s) => (thumb && s === 0 && shown !== src ? 1 : 2))}
    />
  );
}
