"use client";
import { useId, useState } from "react";
import { estimateCharges } from "../../lib/preflight/powerbank-calc";
import { ClaimText } from "./claim";

export function PowerbankCalc() {
  const id = useId();
  const [bank, setBank] = useState("10000");
  const [phone, setPhone] = useState("4500");
  const r = estimateCharges({ bankMah: Number(bank || NaN), phoneMah: Number(phone || NaN) });
  return (
    <section className="fp-calc" aria-labelledby={id + "t"}>
      <span className="fp-kicker">מחשבון</span>
      <h2 id={id + "t"}>כמה טעינות זה ייתן באמת?</h2>
      <div className="fp-calc-grid">
        <label><span>קיבולת הסוללה הניידת (mAh)</span><input inputMode="numeric" value={bank} onChange={(e) => setBank(e.target.value)} /></label>
        <label><span>סוללת הטלפון (mAh)</span><input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      </div>
      <div className="fp-calc-out" role="status" aria-live="polite">
        {r.ok ? (
          <>
            <p>בערך <strong dir="ltr">{r.charges}</strong> טעינות מלאות ({r.bankWh}Wh).</p>
            {r.over100Wh && (
              <p><ClaimText claim={{ text: "מעל 100Wh: בטיסה ייתכן שתידרש הסכמת חברת התעופה, ויש חברות שאוסרות.", needsVerification: true }} /></p>
            )}
            <details><summary>ההנחות שמאחורי המספר</summary><ul>{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
          </>
        ) : (
          <p className="fp-calc-err">{r.error}</p>
        )}
      </div>
    </section>
  );
}
