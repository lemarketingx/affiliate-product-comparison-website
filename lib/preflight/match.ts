import type { ProductType } from "./types.ts";
import { containsPhrase, tokens, variants } from "./text.ts";

export type Match = { type: ProductType; score: number; matched: string[] };

/** Free text ("אני רוצה מצלמות לבית") → ranked product types. */
export function matchNeed(query: string, types: ProductType[]): Match[] {
  const qTokens = tokens(query).flatMap(variants);
  if (!qTokens.length) return [];
  const results: Match[] = [];
  for (const type of types) {
    let score = 0;
    const matched: string[] = [];
    for (const phrase of [...type.synonyms, type.name]) {
      if (containsPhrase(query, phrase)) {
        score += 3 * tokens(phrase).length;
        matched.push(phrase);
      }
    }
    if (!score) {
      // Weak signal: single meaningful words shared with synonyms.
      const words = new Set(type.synonyms.flatMap(tokens).filter((w) => w.length >= 3));
      for (const w of words) if (qTokens.includes(w)) { score += 1; matched.push(w); }
    }
    if (score > 0) results.push({ type, score, matched });
  }
  return results.sort((a, b) => b.score - a.score);
}
