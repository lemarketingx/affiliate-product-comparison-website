// Plain AliExpress search link. This is NOT an affiliate link: the approved
// affiliate API used by this site only returns product promotion links, so the
// UI labels these buttons as regular links.
export function aliSearchUrl(term: string): string {
  const words = term
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10);
  const slug = words.map((w) => encodeURIComponent(w)).join("-");
  return "https://www.aliexpress.com/w/wholesale-" + (slug || "search") + ".html";
}
