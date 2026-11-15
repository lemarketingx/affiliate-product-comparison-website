"use client";
import { useId, useState } from "react";
import { landedCost } from "../../lib/preflight/landed-cost";
import { IMPORT_TAX } from "../../lib/preflight/import-tax";
import type { IsraelPrice } from "../../lib/preflight/israel-prices";

const fmt = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

/**
 * "How much does it really cost": line-by-line landed cost. Missing inputs stay
 * "לא חושב"; an Israeli price is either owner-entered with a source or typed by
 * the visitor. The result is an estimated gap, never a promised saving.
 */
export function CostCalc({
  apiPriceILS,
  accessories,
  israelPrices,
  usdRate = null,
}: {
  apiPriceILS: number | null;
  accessories: string[];
  israelPrices: IsraelPrice[];
  usdRate?: { rate: number; date: string; source: string } | null;
}) {
  const id = useId();
  const [price, setPrice] = useState(apiPriceILS ? String(apiPriceILS) : "");
  const [shipping, setShipping] = useState("");
  const [acc, setAcc] = useState<Record<string, string>>({});
  const [rate, setRate] = useState(usdRate ? String(usdRate.rate) : "");
  const [israelChoice, setIsraelChoice] = useState(israelPrices.length ? "0" : "visitor");
  const [israelTyped, setIsraelTyped] = useState("");
  const owner = israelChoice !== "visitor" ? israelPrices[Number(israelChoice)] : null;
  const typed = parse(israelTyped);
  const fromApi = apiPriceILS !== null && parse(price) === apiPriceILS;
  const r = landedCost(
    {
      itemPriceILS: parse(price),
      itemFromApi: fromApi,
      shippingILS: parse(shipping),
      accessories: accessories.map((label) => ({ label, priceILS: parse(acc[label] ?? "") })),
      usdIlsRate: parse(rate),
      israelPrice: owner
        ? { priceILS: owner.priceILS, origin: "owner", label: owner.store }
        : typed
          ? { priceILS: typed, origin: "visitor", label: "המחיר שהזנתם" }
          : null,
    },
    IMPORT_TAX,
  );
  return (
    <section className="fp-calc fp-cost" aria-labelledby={id + "t"}>
      <span className="fp-kicker">עלות נחיתה</span>
      <h2 id={id + "t"}>כמה זה עולה באמת?</h2>
      <div className="fp-calc-grid">
        <label><span>מחיר באליאקספרס (₪)</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label><span>משלוח לישראל (₪, מעמוד התשלום)</span><input inputMode="decimal" value={shipping} placeholder="0 אם חינם" onChange={(e) => setShipping(e.target.value)} /></label>
        {accessories.map((a) => (
          <label key={a}><span>{a} (₪)</span><input inputMode="decimal" value={acc[a] ?? ""} placeholder="0 אם יש לכם" onChange={(e) => setAcc((s) => ({ ...s, [a]: e.target.value }))} /></label>
        ))}
        {IMPORT_TAX.verified && (
          <label><span>שער דולר (₪){usdRate ? ` · יציג ${new Date(usdRate.date).toLocaleDateString("he-IL")}` : ""}</span><input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
        )}
        <label>
          <span>מחיר להשוואה בישראל</span>
          <select value={israelChoice} onChange={(e) => setIsraelChoice(e.target.value)}>
            {israelPrices.map((p, i) => (
              <option key={i} value={String(i)}>{p.store}: {fmt(p.priceILS)} ({p.label})</option>
            ))}
            <option value="visitor">אזין מחיר שראיתי</option>
          </select>
        </label>
        {israelChoice === "visitor" && (
          <label><span>המחיר שראיתם בישראל (₪)</span><input inputMode="decimal" value={israelTyped} onChange={(e) => setIsraelTyped(e.target.value)} /></label>
        )}
      </div>
      <table className="fp-cost-table" aria-label="פירוט עלות כוללת">
        <tbody>
          {r.lines.map((l) => (
            <tr key={l.id} className={"is-" + l.state}>
              <th scope="row">{l.label}{l.note && <small>{l.note}</small>}</th>
              <td dir="ltr">{l.amount === null ? <span className="fp-chip is-wait">לא חושב</span> : fmt(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{r.complete ? "עלות כוללת משוערת" : "סכום חלקי (חסרים רכיבים)"}</th>
            <td dir="ltr">{fmt(r.subtotal)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="fp-calc-out" role="status" aria-live="polite">
        {r.gap !== null ? (
          <p>
            פער משוער מול {owner ? owner.store : "המחיר שהזנתם"}: <strong dir="ltr">{fmt(r.gap)}</strong>{" "}
            {r.gap < 0 ? "(כאן יקר יותר)" : ""}. זו הערכה ולא חיסכון מובטח.
          </p>
        ) : (
          <p>{r.gapReason}</p>
        )}
        {owner && (
          <p className="fp-fine">
            מחיר בישראל: {owner.store}, {owner.label}. נבדק {owner.checkedAt}.{" "}
            <a href={owner.url} target="_blank" rel="noopener noreferrer">למקור</a>
          </p>
        )}
      </div>
      <details className="fp-cost-tax">
        <summary>איך מחושב המס?</summary>
        <p>
          יבוא אישי עד {IMPORT_TAX.exemptionUsd}$ (ערך המוצרים בלי משלוח) פטור ממסים. מעל זה משלמים מע&quot;מ{" "}
          {Math.round((IMPORT_TAX.vatRate ?? 0) * 100)}% על המוצרים והמשלוח, ומעל {IMPORT_TAX.customsFreeUpToUsd}$ ייתכן גם מכס. הזמנות
          מאותו מוכר שמגיעות בתוך {IMPORT_TAX.combineWindowHours} שעות נספרות יחד.
        </p>
        <ul>
          {IMPORT_TAX.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> · נבדק {s.checkedAt}
            </li>
          ))}
          {usdRate && <li>{usdRate.source}, עדכון {new Date(usdRate.date).toLocaleDateString("he-IL")}</li>}
        </ul>
      </details>
      <p className="fp-fine">שום נתון מהמחשבון לא נשלח לשרת. הכול נשאר בדפדפן שלכם.</p>
    </section>
  );
}
