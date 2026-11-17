"use client";

import { useState } from "react";

/** Real brand marks where Simple Icons has an asset. The text wordmark is a
 * deliberate accessible fallback, not an invented imitation of a company logo. */
const marks: Record<string, string> = {
  xiaomi: "xiaomi", redmi: "redmi", poco: "poco",
  baseus: "baseus", ugreen: "ugreen", anker: "anker",
  soundcore: "soundcore", qcy: "qcy", edifier: "edifier",
  "70mai": "70mai", dreame: "dreame", roborock: "roborock",
  amazfit: "amazfit", reolink: "reolink", yeelight: "yeelight",
};
const colors: Record<string, string> = {
  xiaomi: "#c2410c", redmi: "#be123c", poco: "#7a5f00", // darkened to WCAG AA (≥4.5:1 on white)
  baseus: "#242424", ugreen: "#087f40", anker: "#1264b0",
  soundcore: "#0369a1", qcy: "#121c2e", edifier: "#161f30",
  "70mai": "#263a4c", dreame: "#172b34", roborock: "#e31d34",
  amazfit: "#8e43c6", reolink: "#0b6aa8", yeelight: "#266ce2",
};

export default function BrandLogo({ slug, name }: { slug: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const icon = marks[slug];
  return <span className={"dpb-logo" + (broken || !icon ? " dpb-logo-fallback" : "")} style={{ color: colors[slug] || "#182333" }} dir="ltr">
    {icon && !broken && <img
      src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${icon}.svg`}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />}
    <strong>{name}</strong>
  </span>;
}
