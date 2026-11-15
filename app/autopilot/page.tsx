import { PublicShell } from "../public-shell";
import { visibleTypes } from "../../lib/preflight";
import { ISRAEL_PRICES, validIsraelPrice } from "../../lib/preflight/israel-prices";
import Autopilot from "../_preflight/autopilot";

export const dynamic = "force-dynamic";
export const metadata = { title: "טייס אוטומטי לקנייה | DealPilot", alternates: { canonical: "/autopilot" } };

export default async function AutopilotPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 400) : undefined);
  return (
    <PublicShell>
      <main id="main" className="fp-wrap fp-section">
        <div className="fp-page-title">
          <span className="fp-kicker">טייס אוטומטי</span>
          <h1>תגידו מה הבעיה. נבנה תוכנית קנייה.</h1>
          <p className="fp-lead">כמה שאלות קצרות, ובסוף תקבלו כרטיס טיסה אישי: מה לקנות, מה לרוב לא בקופסה, מה לחפש, מה לבדוק, וכמה זה עולה באמת.</p>
        </div>
        <Autopilot
          types={visibleTypes()}
          israelPrices={ISRAEL_PRICES.filter(validIsraelPrice)}
          initial={{ q: one(sp.q), t: one(sp.t), a: one(sp.a) }}
        />
      </main>
    </PublicShell>
  );
}
