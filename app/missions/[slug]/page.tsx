import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpLeft } from "lucide-react";
import { PublicShell } from "../../public-shell";
import { ProductCard } from "../../product-card";
import { findVisibleType, visibleTypes } from "../../../lib/preflight";
import { buildPlan } from "../../../lib/preflight/plan";
import { detectType } from "../../../lib/preflight/detect";
import { pricesFor } from "../../../lib/preflight/israel-prices";
import { getCatalog } from "../../../lib/aliexpress/catalog";
import { Manifest } from "../../_preflight/manifest";
import { SearchTerms } from "../../_preflight/search-terms";
import { Briefing } from "../../_preflight/briefing";
import { DraftBanner } from "../../_preflight/claim";
import { StorageCalc } from "../../_preflight/storage-calc";
import { PowerbankCalc } from "../../_preflight/powerbank-calc";
import { CostCalc } from "../../_preflight/cost-calc";
import { Terms } from "../../_preflight/term";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = findVisibleType(slug);
  return { title: t ? t.name + ": תדריך קנייה | DealPilot" : "יעד לא נמצא | DealPilot", alternates: { canonical: "/missions/" + slug } };
}

export default async function Mission({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const type = findVisibleType(slug);
  if (!type) notFound();
  const plan = buildPlan(type);
  const all = visibleTypes();
  const catalog = await getCatalog();
  const products = catalog.items.filter((p) => detectType(p.title, all)?.type.id === type.id).slice(0, 8);
  const questionTerms = [...new Set(type.questions.flatMap((q) => q.terms ?? []))];
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-mission">
        <nav className="fp-crumbs" aria-label="מיקום">
          <Link href="/">בית</Link><span>/</span><Link href="/missions">יעדים</Link><span>/ {type.name}</span>
        </nav>
        <header className="fp-mission-hero">
          <div>
            <span className="fp-kicker">יעד <span dir="ltr">TLV→{type.code}</span> · {type.group}</span>
            <h1>{type.name}</h1>
            <p className="fp-lead">{type.need}</p>
            <div className="fp-actions">
              <Link className="fp-btn" href={"/autopilot?t=" + type.id}>התאימו לי בטייס האוטומטי <ArrowUpLeft size={18} /></Link>
            </div>
          </div>
          <div className="fp-mission-board" aria-hidden="true">
            <span>FROM</span><strong>TLV</strong>
            <span>TO</span><strong>{type.code}</strong>
            <span>GATE</span><strong>{String(plan.items.length).padStart(2, "0")}</strong>
          </div>
        </header>
        <DraftBanner status={type.status} />
        {questionTerms.length > 0 && (
          <section className="fp-mission-terms" aria-label="מונחים שכדאי להכיר">
            <span>מונחים שכדאי להכיר לפני שמתחילים:</span>
            <Terms ids={questionTerms} />
          </section>
        )}
        <div className="fp-mission-grid">
          <div>
            <Manifest items={plan.items} code={type.code} />
            <SearchTerms terms={plan.search} />
          </div>
          <div>
            {plan.calculators.includes("storage") && <StorageCalc media={type.id === "security-recorder" ? "hdd" : "sd"} />}
            {type.id === "powerbank" && <PowerbankCalc />}
            <CostCalc
              apiPriceILS={null}
              accessories={plan.items.filter((i) => i.status === "required" && i.search).map((i) => i.label)}
              israelPrices={pricesFor(type.id)}
            />
          </div>
        </div>
        <Briefing plan={plan} />
        <section className="fp-section">
          <div className="fp-section-head">
            <div>
              <span className="fp-kicker">מהקטלוג</span>
              <h2>מוצרים שזוהו כמתאימים ליעד</h2>
            </div>
          </div>
          {products.length ? (
            <>
              <div className="fp-grid">{products.map((p) => <ProductCard key={p.id} item={p} />)}</div>
              <p className="fp-fine">
                השיוך ליעד מתבצע אוטומטית לפי מילים בכותרת הספק, ויכול לטעות. המוצרים כוללים קישורי שותפים: אם תקנו דרכם, ייתכן שנקבל עמלה. <Link href="/disclosure">גילוי נאות</Link>
              </p>
            </>
          ) : (
            <div className="fp-empty">
              <h3>אין כרגע בקטלוג מוצרים שזוהו ליעד הזה</h3>
              <p>אפשר לחפש ישירות באליאקספרס עם מילות החיפוש למעלה. אנחנו לא ממציאים מוצרים.</p>
            </div>
          )}
        </section>
      </main>
    </PublicShell>
  );
}
