import type { Source } from "./types.ts";

// Sources actually consulted for this content. checkedAt is the day they were read.
// Secondary sources are labelled as such in their title; official sources are preferred.
export const SOURCES = {
  plugs: {
    url: "https://www.worldstandards.eu/electricity/plug-voltage-by-country/",
    title: "WorldStandards: plug & voltage by country (מקור משני)",
    checkedAt: "2026-11-15",
  },
} satisfies Record<string, Source>;
