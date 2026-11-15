import { GLOSSARY } from "../../lib/preflight/glossary";

/** Click-to-explain technical term. Native <details>: keyboard and screen-reader friendly. */
export function Term({ id }: { id: string }) {
  const t = GLOSSARY[id];
  if (!t) return null;
  return (
    <details className="fp-term">
      <summary>
        <span dir="auto">{t.term}</span>
        <span className="fp-term-q" aria-hidden="true">?</span>
        <span className="fp-sr">מה זה?</span>
      </summary>
      <span className="fp-term-body">{t.short}</span>
    </details>
  );
}

export function Terms({ ids }: { ids: string[] }) {
  const known = ids.filter((id) => GLOSSARY[id]);
  if (!known.length) return null;
  return (
    <div className="fp-terms">
      {known.map((id) => (
        <Term key={id} id={id} />
      ))}
    </div>
  );
}
