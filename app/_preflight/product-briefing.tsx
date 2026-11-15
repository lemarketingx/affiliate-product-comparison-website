import Link from "next/link";
import { PackageX, Search } from "lucide-react";
import { visibleTypes } from "../../lib/preflight";
import { detectType } from "../../lib/preflight/detect";
import { buildPlan } from "../../lib/preflight/plan";
import { aliSearchUrl } from "../../lib/preflight/search";
import { pricesFor } from "../../lib/preflight/israel-prices";
import { ClaimList, DraftBanner } from "./claim";
import { CostCalc } from "./cost-calc";

/** Per-product "what's probably not in the box" + Israel fit + landed cost. */
export function ProductBriefing({ title, priceILS, usdRate = null }: { title: string; priceILS: number | null; usdRate?: import("../../lib/preflight/tax-estimate").UsdRate | null }) {
  const types = visibleTypes();
  const found = detectType(title, types);
  if (!found) {
    return (
      <section className="fp-calc-wrap" aria-label="עלות כוללת">
        <CostCalc apiPriceILS={priceILS} accessories={[]} israelPrices={[]} usdRate={usdRate} />
      </section>
    );
  }
  const type = types.find((t) => t.id === found.type.id)!;
  const plan = buildPlan(type);
  const missing = plan.items.filter((i) => i.status === "required" || i.status === "recommended");
  return (
    <section className="fp-pbrief" aria-labelledby="pbrief-title">
      <header>
        <span className="fp-kicker">תדריך טרום המראה · <span dir="ltr">TLV→{type.code}</span></span>
        <h2 id="pbrief-title"><PackageX size={22} aria-hidden="true" /> מה כנראה לא בקופסה</h2>
        <p className="fp-fine">
          זיהינו את המוצר כ&quot;{type.name}&quot; לפי מילים בכותרת: {found.matched.map((m) => '"' + m + '"').join(", ")}. הזיהוי
          אוטומטי. אם הוא שגוי, התעלמו מהתדריך.
        </p>
      </header>
      <DraftBanner status={type.status} />
      <ul className="fp-pbrief-list">
        {missing.map((i) => (
          <li key={i.id} className={"is-" + i.status}>
            <span className="fp-manifest-tag">{i.status === "required" ? "בדרך כלל לא כלול · חובה" : "לעיתים לא כלול"}</span>
            <strong>{i.label}</strong>
            <p>{i.why} בדקו בתיאור המוכר.</p>
            {i.search && (
              <a href={aliSearchUrl(i.search)} target="_blank" rel="noopener noreferrer nofollow" className="fp-manifest-search">
                <Search size={15} aria-hidden="true" /> חיפוש: <span dir="ltr">{i.search}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
      {plan.israel.length > 0 && (
        <div className="fp-pbrief-israel">
          <h3>מתאים לישראל?</h3>
          <ClaimList claims={plan.israel} />
        </div>
      )}
      {plan.buyLocal.flagged && plan.buyLocal.text && <p className="fp-notice is-wait">{plan.buyLocal.text}</p>}
      <div className="fp-actions">
        <Link className="fp-btn fp-btn-sm" href={"/autopilot?t=" + type.id}>תוכנית מותאמת בטייס האוטומטי</Link>
        <Link className="fp-btn fp-btn-sm fp-btn-ghost" href={"/missions/" + type.id}>כל התדריך ליעד</Link>
      </div>
      <p className="fp-fine">קישורי החיפוש הם קישורים רגילים לאליאקספרס, לא קישורי שותפים.</p>
      <CostCalc
        apiPriceILS={priceILS}
        accessories={plan.items.filter((i) => i.status === "required" && i.search).map((i) => i.label)}
        israelPrices={pricesFor(type.id)}
        usdRate={usdRate}
      />
    </section>
  );
}
