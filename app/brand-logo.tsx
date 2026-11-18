"use client";

import { useState, type CSSProperties } from "react";

/** Real logo files, self-hosted under /public/brands, used only to identify the
 * brand of a listed product (no affiliation implied). Sources and licences:
 * docs/BRAND-ASSETS.md. "wordmark" logos contain the name and replace the text;
 * "mark" logos are a symbol shown next to the name. Brands without a free logo
 * file keep the typographic monogram: an official mark is never invented. */
const logos: Record<string, { file: string; kind: "wordmark" | "mark" }> = {
  // Free-licence files (Simple Icons CC0, Wikimedia Commons public domain)
  xiaomi: { file: "/brands/xiaomi.svg", kind: "mark" },
  anker: { file: "/brands/anker.svg", kind: "wordmark" },
  creality: { file: "/brands/creality.svg", kind: "wordmark" },
  anycubic: { file: "/brands/anycubic.svg", kind: "mark" },
  // From each brand's official website, owner decision 2026-11-18 (identification only)
  ugreen: { file: "/brands/ugreen.svg", kind: "wordmark" },
  baseus: { file: "/brands/baseus.png", kind: "mark" },
  rockbros: { file: "/brands/rockbros.png", kind: "wordmark" },
  qcy: { file: "/brands/qcy.png", kind: "wordmark" },
  edifier: { file: "/brands/edifier.png", kind: "wordmark" },
  ddpai: { file: "/brands/ddpai.svg", kind: "wordmark" },
  viofo: { file: "/brands/viofo.png", kind: "wordmark" },
  dreame: { file: "/brands/dreame.svg", kind: "wordmark" },
  roborock: { file: "/brands/roborock.svg", kind: "mark" },
  reolink: { file: "/brands/reolink.svg", kind: "wordmark" },
  naturehike: { file: "/brands/naturehike.png", kind: "wordmark" },
  ulanzi: { file: "/brands/ulanzi.png", kind: "mark" },
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
  const logo = broken ? null : logos[slug];
  const palette = palettes[slug] ?? { accent: "#334155", tint: "#edf2f7" };
  const style = {
    "--dp-brand-accent": palette.accent,
    "--dp-brand-tint": palette.tint,
  } as CSSProperties;

  if (logo?.kind === "wordmark")
    return (
      <span className={"dpb-logo dp-brand-lockup is-wordmark" + (compact ? " is-compact" : "")} style={style} dir="ltr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dp-brand-wordmark" src={logo.file} alt={name} height={compact ? 14 : 30} decoding="async" onError={() => setBroken(true)} />
      </span>
    );

  return (
    <span className={"dpb-logo dp-brand-lockup" + (compact ? " is-compact" : "")} style={style} dir="ltr">
      <span className="dp-brand-mark" aria-hidden="true">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.file} alt="" width={30} height={30} decoding="async" onError={() => setBroken(true)} />
        ) : (
          <span className="dp-brand-monogram">{name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <strong className="dp-brand-name">{name}</strong>
    </span>
  );
}
