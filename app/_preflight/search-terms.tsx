import { ExternalLink } from "lucide-react";
import type { SearchTerm } from "../../lib/preflight/types";
import { aliSearchUrl } from "../../lib/preflight/search";

/** Hebrew need → English search phrase that actually works on AliExpress. */
export function SearchTerms({ terms }: { terms: SearchTerm[] }) {
  return (
    <section className="fp-lexicon" aria-labelledby="lexicon-title">
      <span className="fp-kicker">מתורגמן המגדל</span>
      <h2 id="lexicon-title">ככה מחפשים את זה באליאקספרס</h2>
      <ul>
        {terms.map((t) => (
          <li key={t.en}>
            <span className="fp-lexicon-he">{t.he}</span>
            <code dir="ltr">{t.en}</code>
            {t.note && <small>{t.note}</small>}
            <a className="fp-btn fp-btn-sm fp-btn-ghost" href={aliSearchUrl(t.en)} target="_blank" rel="noopener noreferrer nofollow">
              חפשו באליאקספרס <ExternalLink size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <p className="fp-fine">קישורי החיפוש הם קישורים רגילים לאליאקספרס, לא קישורי שותפים. לא נקבל עליהם עמלה.</p>
    </section>
  );
}
