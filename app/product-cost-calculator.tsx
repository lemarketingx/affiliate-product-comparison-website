"use client";
import { useMemo, useState } from "react";
import { Calculator, AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import { IMPORT_TAX } from "../lib/preflight/import-tax";
import { calculateBasketCost } from "../lib/preflight/basket-cost";
import type { UsdRate } from "../lib/preflight/tax-estimate";

const money = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);
const asNum = (s: string): number | null => s.trim() === "" ? null : Number(s);
export default function ProductCostCalculator({ priceILS, usdRate }: { priceILS: number; usdRate: UsdRate | null }) {
  const [price, setPrice] = useState(String(priceILS));
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [otherGoods, setOtherGoods] = useState("0");
  const [shipping, setShipping] = useState("");
  const [insurance, setInsurance] = useState("0");
  const [handling, setHandling] = useState("0");
  const [overrideRate, setOverrideRate] = useState("");
  const [feeIncluded, setFeeIncluded] = useState(false);
  const fx = overrideRate.trim() ? Number(overrideRate) : usdRate?.rate ?? null;
  const result = useMemo(() => calculateBasketCost({
    unitPriceILS: Number(price), quantity: Number(quantity), discountILS: Number(discount),
    otherGoodsILS: Number(otherGoods), shippingILS: asNum(shipping), insuranceILS: asNum(insurance),
    handlingILS: asNum(handling), usdIlsRate: fx,
  }, IMPORT_TAX), [price, quantity, discount, otherGoods, shipping, insurance, handling, fx]);
  const complete = result.estimatedTotalILS !== null;
  const shownTotal = feeIncluded && complete ? result.knownSubtotalILS : result.estimatedTotalILS;
  return (
    <section className="fp-cost-tool" id="cost-calculator" aria-labelledby="fp-cost-title">
      <header className="fp-cost-header">
        <div><span className="fp-kicker"><Calculator size={16} aria-hidden="true" /> מחשבון קנייה לישראל</span>
          <h2 id="fp-cost-title">כמה באמת תשלמו?</h2>
          <p>חשבנו את עלות המוצרים, המשלוח והמע״מ המשוער. הסכומים בקופה הם הקובעים.</p>
        </div>
      </header>
      <div className="fp-cost-fields">
        <label>מחיר יחידה אחרי שינוי גרסה (₪)
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
        </label>
        <label>כמות
          <input type="number" min="1" max="100" step="1" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </label>
        <label>הנחה כוללת שאושרה בקופה (₪)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={discount} onChange={e => setDiscount(e.target.value)} />
        </label>
        <label>מוצרים נוספים באותו משלוח (₪)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={otherGoods} onChange={e => setOtherGoods(e.target.value)} />
        </label>
        <label>משלוח לישראל (₪) <small>נדרש, 0 אם חינם</small>
          <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="בדקו בקופה" value={shipping} onChange={e => setShipping(e.target.value)} />
        </label>
        <label>ביטוח משלוח (₪)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={insurance} onChange={e => setInsurance(e.target.value)} />
        </label>
        <label>עמלות טיפול ידועות (₪)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={handling} onChange={e => setHandling(e.target.value)} />
        </label>
        <label>שער דולר לחישוב (₪)
          <input type="number" min="0.01" step="0.0001" inputMode="decimal" value={overrideRate} placeholder={usdRate ? String(usdRate.rate) : "הזינו שער"} onChange={e => setOverrideRate(e.target.value)} />
        </label>
      </div>
      <p className="fp-cost-fx">{usdRate ? `שער יציג מבנק ישראל: ${usdRate.rate} ₪ ל־$1 (תאריך ${new Date(usdRate.date).toLocaleDateString("he-IL")}). שער המכס עשוי להיות שונה.` : "השער היציג אינו זמין, הזינו שער ידוע. שער המכס בפועל עשוי להיות שונה."}</p>
      <label className="fp-cost-checked"><input type="checkbox" checked={feeIncluded} onChange={e => setFeeIncluded(e.target.checked)}/>הסכום שהזנתי כבר כולל מע״מ שנגבה בקופה</label>
      <div className="fp-cost-result" aria-live="polite" aria-atomic="true">
        {result.goodsILS !== null && <div className="fp-cost-line"><span>מוצרים לאחר הנחה, כולל פריטים נוספים</span><strong>{money(result.goodsILS)}</strong></div>}
        {result.thresholdUSD !== null && <div className="fp-cost-line"><span>שווי מוצרים למבחן הפטור</span><strong dir="ltr">${result.thresholdUSD.toFixed(2)}$</strong></div>}
        {result.estimatedVAT !== null && <div className="fp-cost-line"><span>מע״מ משוער {feeIncluded ? "(כלול בסכומים שהוזנו)" : "(נוסף לסכומים שהוזנו)"}</span><strong>{money(result.estimatedVAT)}</strong></div>}
        {complete && <div className="fp-cost-total"><span>{feeIncluded ? "עלות משוערת, מע״מ כבר כלול בקופה" : "עלות כוללת משוערת"}</span><strong>{money(shownTotal!)}</strong></div>}
        {!complete && <div className="fp-cost-pending"><AlertTriangle size={19} aria-hidden="true" /><span>החישוב אינו שלם. לא מציגים מחיר סופי לא מבוסס.</span></div>}
        <p className="fp-cost-message">{result.status === "exempt" ? <CheckCircle2 size={17} aria-hidden="true" /> : <AlertTriangle size={17} aria-hidden="true" />}{result.message}</p>
      </div>
      <div className="fp-cost-footnote">
        <p>החישוב אינו כולל מכס ומס קנייה מיוחדים, אגרות לא ידועות או מוצרים מוחרגים (למשל אלכוהול וטבק). מעל 500 דולר אין הערכה סופית. משלוחים מאותו ספק בתוך 72 שעות עלולים להיחשב יחד. הזינו רק הנחה שאושרה בפועל.</p>
        <a target="_blank" rel="noopener noreferrer" href="https://www.gov.il/he/service/customs-tax-calculation-import-by-israelis">
          למחשבון הרשמי של רשות המסים <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
