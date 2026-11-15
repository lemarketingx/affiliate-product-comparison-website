"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export default function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const src = list[active];
  return (
    <div className="og-gallery">
      <div className="og-gallery-main">
        {src && !failed[active] ? (
          <img
            src={src}
            alt={title}
            width={600}
            height={600}
            referrerPolicy="no-referrer"
            onError={() => setFailed((f) => ({ ...f, [active]: true }))}
          />
        ) : (
          <span className="og-img-fallback" role="img" aria-label="תמונת המוצר אינה זמינה">
            <ImageOff size={56} />
          </span>
        )}
      </div>
      {list.length > 1 && (
        <div className="og-thumbs">
          {list.slice(0, 8).map((image, index) => (
            <button
              type="button"
              key={image}
              aria-pressed={index === active}
              aria-label={"הצגת תמונת מוצר " + (index + 1)}
              onClick={() => setActive(index)}
            >
              <img
                src={image}
                width={72}
                height={72}
                loading="lazy"
                referrerPolicy="no-referrer"
                alt=""
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
