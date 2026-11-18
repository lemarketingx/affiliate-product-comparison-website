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

/** The seller's video. Mounted only after a click, so it costs nothing on page load. */
function SellerVideo({ src, poster, onDead }: { src: string; poster: string | undefined; onDead: () => void }) {
  return (
    <figure className="fp-video">
      <video
        src={src}
        poster={poster}
        controls
        autoPlay
        playsInline
        preload="metadata"
        width={600}
        height={600}
        aria-label="סרטון המוצר של המוכר"
        onError={onDead}
      />
      <figcaption>סרטון של המוכר, מתוך AliExpress</figcaption>
    </figure>
  );
}

export default function ProductGallery({
  images,
  title,
  label = null,
  video = null,
}: {
  images: string[];
  title: string;
  label?: string | null;
  video?: string | null;
}) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoDead, setVideoDead] = useState(false);
  const [dead, setDead] = useState<Record<string, true>>({});
  const thumbs = list.slice(0, 8).filter((s) => !dead[s]);
  const hasVideo = Boolean(video) && !videoDead;
  const showVideo = hasVideo && playing;
  const show = (index: number) => {
    setPlaying(false);
    setActive(index);
  };
  return (
    <div className="fp-gallery">
      <div className="fp-gallery-main">
        {showVideo ? (
          <SellerVideo
            src={video!}
            poster={list[0]}
            onDead={() => {
              setVideoDead(true);
              setPlaying(false);
            }}
          />
        ) : (
          <>
            <MainImage key={list[active] ?? "none"} src={list[active]} title={title} label={label} />
            {hasVideo && (
              <button type="button" className="fp-play" onClick={() => setPlaying(true)} aria-label="הפעלת סרטון המוכר">
                <span aria-hidden="true">▶</span> סרטון
              </button>
            )}
          </>
        )}
      </div>
      {(thumbs.length > 1 || hasVideo) && (
        <div className="fp-thumbs">
          {hasVideo && (
            <button type="button" className="fp-thumb-video" aria-pressed={showVideo} aria-label="הצגת סרטון המוכר" onClick={() => setPlaying(true)}>
              <span aria-hidden="true">▶</span>
            </button>
          )}
          {thumbs.map((image) => {
            const index = list.indexOf(image);
            return (
              <button type="button" key={image} aria-pressed={!showVideo && index === active} aria-label={"הצגת תמונת מוצר " + (index + 1)} onClick={() => show(index)}>
                <Thumb src={image} onDead={() => queueMicrotask(() => setDead((d) => (d[image] ? d : { ...d, [image]: true })))} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
