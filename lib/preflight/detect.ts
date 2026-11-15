import type { ProductType } from "./types.ts";
import { containsPhrase } from "./text.ts";

export type Detection = { type: ProductType; matched: string[] };

/**
 * Guess the product type of a supplier listing from its title. Transparent and
 * conservative: the matched words are shown to the visitor, exclusions win, and
 * a tie between types returns null rather than a confident wrong briefing.
 */
export function detectType(title: string, types: ProductType[]): Detection | null {
  const scored = types
    .filter((t) => !(t.exclude ?? []).some((w) => containsPhrase(title, w)))
    .map((type) => {
      const matched = type.detect.filter((w) => containsPhrase(title, w));
      const score = matched.reduce((s, w) => s + w.split(" ").length, 0);
      return { type, matched, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null;
  return { type: scored[0].type, matched: scored[0].matched };
}
