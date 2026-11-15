// Hebrew-aware normalisation for simple keyword matching (no AI).
const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // niqqud / cantillation
    .replace(/[״׳"'`]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^\p{L}\p{N}.\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const PREFIXES = ["וה", "שה", "וב", "ול", "ומ", "ה", "ו", "ב", "ל", "מ", "ש", "כ"];
/** Token plus variants with a common Hebrew prefix letter removed. */
export function variants(token: string): string[] {
  const out = new Set([token]);
  if (/^[א-ת]/.test(token))
    for (const p of PREFIXES)
      if (token.startsWith(p) && token.length - p.length >= 3) out.add(token.slice(p.length));
  return [...out];
}
export function tokens(input: string): string[] {
  return normalize(input).split(" ").filter(Boolean);
}
/** Whole-phrase containment on token boundaries, tolerant of Hebrew prefixes. */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const hay = tokens(haystack).map(variants);
  const needle = tokens(phrase);
  if (!needle.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((n, j) => hay[i + j].some((v) => v === n || (n.length >= 4 && v.startsWith(n)))))
      return true;
  }
  return false;
}
