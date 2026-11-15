"use client";
import { useState } from "react";

type Variant = {
  name: string;
  changed: string;
  params: Record<string, string>;
  code: string | null;
  message: string | null;
  linkReturned: string | null;
  trackingEchoed: string | null;
  ok: boolean;
};
const ECHO: Record<string, string> = { same: "הוחזר וזהה", different: "הוחזר ושונה", missing: "לא הוחזר" };

export default function ProbeButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ origin: string; source: string; variants: Variant[] } | null>(null);
  return (
    <div>
      <button
        type="button"
        className="dp-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/admin/banners/probe", { method: "POST" });
            const json = await res.json();
            if (!res.ok) setError("האבחון נכשל: " + json.code);
            else setData(json);
          } catch {
            setError("האבחון נכשל");
          } finally {
            setBusy(false);
          }
        }}
      >
        אבחון link.generate (פרמטר אחד בכל בדיקה)
      </button>
      <p className="dp-muted" role="status">{busy ? "בודק מול ה־API…" : error}</p>
      {data && (
        <div style={{ overflowX: "auto" }}>
          <p className="dp-muted">מקור הבדיקה: {data.origin} · <span dir="ltr">{data.source}</span></p>
          <table className="dp-table">
            <thead>
              <tr><th>בדיקה</th><th>מה שונה</th><th>פרמטרים שנשלחו</th><th>תוצאה</th><th>הודעת הספק (מסוננת)</th><th>קישור</th><th>tracking_id בתשובה</th></tr>
            </thead>
            <tbody>
              {data.variants.map((v) => (
                <tr key={v.name}>
                  <td>{v.name}</td>
                  <td>{v.changed}</td>
                  <td dir="ltr" style={{ fontSize: 12 }}>{Object.entries(v.params).map(([k, val]) => <div key={k}>{k}: {val}</div>)}</td>
                  <td dir="ltr">{v.code}{v.ok ? " ✓" : ""}</td>
                  <td dir="auto">{v.message ?? "—"}</td>
                  <td dir="ltr">{v.linkReturned ?? "—"}</td>
                  <td>{v.trackingEchoed ? ECHO[v.trackingEchoed] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
