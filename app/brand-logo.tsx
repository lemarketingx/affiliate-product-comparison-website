"use client";

import { useState, type CSSProperties } from "react";

/** Use third-party logo assets when available; never invent an official mark.
 * If the asset is unavailable, show a clearly typographic monogram instead. */
const marks: Record<string, string> = {
  xiaomi: "xiaomi", redmi: "redmi", poco: "poco",
  baseus: "baseus", ugreen: "ugreen", anker: "anker",
  soundcore: "soundcore", qcy: "qcy", edifier: "edifier",
  "70mai": "70mai", dreame: "dreame", roborock: "roborock",
  amazfit: "amazfit", reolink: "reolink", yeelight: "yeelight",
};

const palettes: Record<string, { accent: string; tint: string }> = {
  xiaomi: { accent: "#b7470c", tint: "#fff0e5" },
  redmi: { accent: "#b51837", tint: "#fff0f3" },
  poco: { accent: "#6f5200", tint: "#fff6cc" },
  baseus: { accent: "#24344c", tint: "#edf2fa" },
  ugreen: { accent: "#087b45", tint: "#e7f8ef" },
  anker: { accent: "#1256ae", tint: "#eaf2ff" },
  soundcore: { accent: "#0d6696", tint: "#e8f6fd" },
  qcy: { accent: "#5936a5", tint: "#f0eaff" },
  edifier: { accent: "#34415e", tint: "#eef1f8" },
  "70mai": { accent: "#bb4b12", tint: "#fff0e4" },
  dreame: { accent: "#116875", tint: "#e6f7f7" },
  roborock: { accent: "#b51e39", tint: "#fff0f3" },
  amazfit: { accent: "#7543ad", tint: "#f3ecff" },
  reolink: { accent: "#075caa", tint: "#e9f3ff" },
  yeelight: { accent: "#1265ba", tint: "#e8f4ff" },
  naturehike: { accent: "#4b652d", tint: "#f0f6e8" },
  rockbros: { accent: "#455570", tint: "#edf1f8" },
  ulanzi: { accent: "#bb551a", tint: "#fff0e5" },
  creality: { accent: "#166a99", tint: "#e9f5fd" },
  anycubic: { accent: "#7e4698", tint: "#f8edff" },
  toocki: { accent: "#0a756d", tint: "#e7f8f5" },
};

export default function BrandLogo({ slug, name, compact = false }: {
  slug: string;
  name: string;
  compact?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const icon = marks[slug];
  const palette = palettes[slug] ?? { accent: "#334155", tint: "#edf2f7" };
  const style = {
    "--dp-brand-accent": palette.accent,
    "--dp-brand-tint": palette.tint,
  } as CSSProperties;

  return (
    <span className={"dpb-logo dp-brand-lockup" + (compact ? " is-compact" : "")} style={style} dir="ltr">
      <span className="dp-brand-mark" aria-hidden="true">
        {icon && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${icon}.svg`}
            alt=""
            width={30}
            height={30}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : <span className="dp-brand-monogram">{name.slice(0, 1).toUpperCase()}</span>}
      </span>
      <strong className="dp-brand-name">{name}</strong>
    </span>
  );
}
