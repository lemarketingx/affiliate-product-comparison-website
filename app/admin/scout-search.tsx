"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import type { CatalogSnapshot } from "../../lib/aliexpress/catalog";
import ProductWorkbench, { useCandidateIntake } from "./product-workbench";
export default function ScoutSearch({ initial }: { initial: CatalogSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial),
    [term, setTerm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const intake = useCandidateIntake();
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dealpilot/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: term.trim() }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(
          response.status === 429
            ? "הגעתם למגבלת החיפוש. נסו שוב מאוחר יותר."
            : "החיפוש אינו זמין. בדקו את החיבור או את הרשאות הכניסה.",
        );
      const discovered: CatalogSnapshot = {
        available: true,
        partial: false,
        fetchedAt: body.fetchedAt ?? null,
        items: body.products.map((p: CatalogSnapshot["items"][number]) => ({
          ...p,
          category: "תוצאות חיפוש ספק",
          categorySlug: "discovery",
        })),
      };
      intake(discovered);
      setSnapshot(discovered);
    } catch (error) {
      setError(error instanceof Error ? error.message : "החיפוש נכשל");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="dp-panel" onSubmit={search}>
        <label className="dp-field">
          <span>חיפוש חדש ב־AliExpress · עד 5 ניסיונות בדקה לתהליך שרת</span>
          <input
            required
            minLength={2}
            maxLength={60}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="לדוגמה: desk organizer"
            dir="auto"
          />
        </label>
        <div className="dp-actions">
          <button className="dp-btn" disabled={busy} type="submit">
            <Search size={17} />
            {busy ? "מחפשים אצל הספק…" : "חיפוש מוצרים"}
          </button>
          <button
            className="dp-btn-secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setSnapshot(initial);
              setError("");
            }}
          >
            חזרה לקטלוג
          </button>
        </div>
        <p className="dp-muted">
          תוצאות החיפוש נשמרות בזיכרון הלשונית גם במעבר לבדיקה ולסטודיו תוכן.
          רענון או יציאה מוחקים אותן. אין שינוי בקטלוג הציבורי. בקשות זהות
          משתמשות במטמון של שש שעות; זמן הנתונים המקורי מוצג בכל מועמד.
        </p>
        {error && (
          <div role="alert" className="dp-notice">
            {error}
          </div>
        )}
      </form>
      <ProductWorkbench snapshot={snapshot} />
    </>
  );
}
