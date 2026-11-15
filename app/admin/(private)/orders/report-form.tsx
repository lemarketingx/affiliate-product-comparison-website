"use client";
import { useState } from "react";
import type { OrderReport } from "../../../../lib/aliexpress/orders-normalize";
export default function OrderReportForm() {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Payment Completed");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<OrderReport | null>(null);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setReport(null);
    try {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(Math.min(start.getTime() + 86400000, Date.now()));
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status,
        }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "הגעתם למגבלת הבקשות. נסו שוב מאוחר יותר."
            : "הדוח לא נטען. בדקו הרשאות או התחברו מחדש.",
        );
        return;
      }
      const data = (await response.json()) as OrderReport;
      if (!data.available) {
        setMessage(
          "הדוח אינו זמין מהספק. לא ניתן להסיק שאין הזמנות; נדרשת בדיקת הרשאות וחיבור.",
        );
        return;
      }
      setReport(data);
    } catch {
      setMessage("לא ניתן לטעון את הדוח כרגע. אין נתוני הכנסה זמינים.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dp-panel">
      <h2>טעינת דוח ליום אחד</h2>
      <p className="dp-muted">
        הטווח הוא יום UTC. נטען עמוד אחד של עד 20 הזמנות בסטטוס הנבחר, ללא רענון
        אוטומטי.
      </p>
      <form onSubmit={submit}>
        <label className="dp-field">
          <span>תאריך UTC</span>
          <input
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="dp-field">
          <span>סטטוס ספק</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Payment Completed">Payment Completed</option>
            <option value="Buyer Confirmed Receipt">
              Buyer Confirmed Receipt
            </option>
          </select>
        </label>
        <button className="dp-btn" type="submit" disabled={busy || !date}>
          {busy ? "טוען דוח…" : "בקשת דוח מ־AliExpress"}
        </button>
      </form>
      {message && <p role="alert">{message}</p>}
      {report && (
        <div aria-live="polite">
          <h3>{report.orders.length} הזמנות בעמוד שהתקבל</h3>
          {report.hasMore && <p>קיימים עמודים נוספים; דוח זה חלקי.</p>}
          {report.orders.map((order) => (
            <article key={order.id} className="dp-panel">
              <strong dir="auto">{order.productTitle ?? order.id}</strong>
              <p>
                {order.status ?? "מצב לא זמין"} ·{" "}
                {order.effectStatus ?? "אין נתון ביטול/החזר"}
              </p>
              <p>
                עמלה משוערת בעת תשלום:{" "}
                {order.estimatedPaidCommission ?? "לא זמין"}{" "}
                {order.currency ?? ""}
              </p>
              <p>
                עמלה משוערת בעת השלמה:{" "}
                {order.estimatedFinishedCommission ?? "לא זמין"}{" "}
                {order.currency ?? ""}
              </p>
              <p className="dp-muted">עמלה מאושרת לתשלום: לא זמינה</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
