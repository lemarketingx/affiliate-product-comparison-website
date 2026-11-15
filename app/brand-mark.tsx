"use client";
import { useState } from "react";
import { brandBySlug } from "../lib/dealpilot/brands";

/**
 * Brand logo assets from public Simple Icons SVGs where supplied.
 * Displayed for product identification only, not implying partnership.
 * If a logo is absent or unavailable, show a clean typographic wordmark.
 */
const simpleIcons: Record<string, string> = {
  xiaomi: "xiaomi", anker: "anker", ugreen: "ugreen",
  baseus: "baseus", lenovo: "lenovo", dreame: "dreame",
  roborock: "roborock", ecovacs: "ecovacs", amazfit: "amazfit",
  insta360: "insta360", qcy: "qcy", tineco: "tineco",
};

export function BrandMark({ slug, name, className = "" }: { slug: string; name?: string; className?: string }) {
  const b = brandBySlug(slug);
  const label = name ?? b?.name ?? slug;
  const [failed, setFailed] = useState(false);
  const icon = simpleIcons[slug];
  const src = b?.logo ?? (icon ? `https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${icon}.svg` : null);
  return <span className={"og-brand-logo-wrap " + className} dir="ltr">
    {src && !failed && <img className="og-logo-icon" src={src} alt="" loading="lazy" width={34} height={34} decoding="async" onError={() => setFailed(true)} />}
    <span className="og-logo-wordmark">{label}</span>
  </span>;
}
