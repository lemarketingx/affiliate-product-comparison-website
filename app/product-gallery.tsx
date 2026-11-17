"use client";
import { useState } from "react";
import { ImageFallback, thumbUrl, useImageSource } from "./product-image";

function MainImage({ src, title, label }: { src: string | undefined; title: string; label?: string | null }) {
  const img = useImageSource(src ? [src] : []);
  if (img.failed) return <ImageFallback label={label} big />;
  return (
    <img
      ref={img.ref}
      src={img.src ?? undefined}
      alt={title}
      width={600}
      height={600}
      fetchPriority="high"
      referrerPolicy="no-referrer"
      onError={img.onError}
    />
  );
}

function Thumb({ src, onDead }: { src: string; onDead: () => void }) {
  const small = thumbUrl(src, 100);
  const img = useImageSource(small !== src ? [small, src] : [src]);
  if (img.failed) {
    onDead();
    return null;
  }
  return <img ref={img.ref} src={img.src ?? undefined} width={72} height={72} loading="lazy" referrerPolicy="no-referrer" alt="" onError={img.onError} />;
}

export default function ProductGallery({ images, title, label = null }: { images: string[]; title: string; label?: string | null }) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [dead, setDead] = useState<Record<string, true>>({});
  const thumbs = list.slice(0, 8).filter((s) => !dead[s]);
  return (
    <div className="fp-gallery">
      <div className="fp-gallery-main">
        <MainImage key={list[active] ?? "none"} src={list[active]} title={title} label={label} />
      </div>
      {thumbs.length > 1 && (
        <div className="fp-thumbs">
          {thumbs.map((image) => {
            const index = list.indexOf(image);
            return (
              <button type="button" key={image} aria-pressed={index === active} aria-label={"הצגת תמונת מוצר " + (index + 1)} onClick={() => setActive(index)}>
                <Thumb src={image} onDead={() => queueMicrotask(() => setDead((d) => (d[image] ? d : { ...d, [image]: true })))} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
