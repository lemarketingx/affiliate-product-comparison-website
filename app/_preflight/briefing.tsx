import { Ban, ClipboardCheck, PlaneLanding, Scale } from "lucide-react";
import type { Plan } from "../../lib/preflight/plan";
import { ClaimList } from "./claim";

/** Rules, product-page checklist, Israel fit and honest "buy local" advice. */
export function Briefing({ plan }: { plan: Plan }) {
  const buyLocal = [
    ...(plan.buyLocal.text ? [{ text: plan.buyLocal.text, general: true as const }] : []),
    ...plan.buyLocal.claims,
  ];
  return (
    <div className="fp-briefing">
      {plan.rules.length > 0 && (
        <section className="fp-brief-card">
          <h2><Scale size={20} aria-hidden="true" /> כללי התאמה</h2>
          <ClaimList claims={plan.rules} />
        </section>
      )}
      <section className="fp-brief-card">
        <h2><ClipboardCheck size={20} aria-hidden="true" /> מה בודקים בעמוד המוצר</h2>
        <ul className="fp-ticks">
          {plan.pageChecks.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>
      {plan.israel.length > 0 && (
        <section className="fp-brief-card">
          <h2><PlaneLanding size={20} aria-hidden="true" /> מתאים לישראל?</h2>
          <ClaimList claims={plan.israel} />
        </section>
      )}
      {buyLocal.length > 0 && (
        <section className={"fp-brief-card fp-brief-local" + (plan.buyLocal.flagged ? " is-flagged" : "")}>
          <h2><Ban size={20} aria-hidden="true" /> מתי עדיף לקנות בישראל</h2>
          <ClaimList claims={buyLocal} />
        </section>
      )}
    </div>
  );
}
