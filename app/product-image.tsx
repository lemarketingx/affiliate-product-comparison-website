"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
export default function ProductImage({
  src,
  alt,
  lazy = true,
  width = 420,
  height = 360,
}: {
  src: string | null;
  alt: string;
  lazy?: boolean;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
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
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
