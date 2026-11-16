"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: unknown) {
  const res = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function RunImportButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState("");
  return (
    <div>
      <button
        type="button"
        className="dp-btn"
        disabled={disabled || state === "…"}
        onClick={async () => {
          setState("…");
          try {
            const { ok, data } = await post({ action: "run" });
            setState(
              ok
                ? `ייבוא: ${data.discovery.status} · ${data.discovery.stats.publishedNew} מוצרים חדשים פורסמו · מחירים: ${data.prices.status}, ${data.prices.stats.updated} עודכנו`
                : "ההרצה נכשלה: " + (data.code ?? "UNKNOWN"),
            );
            router.refresh();
          } catch {
            setState("ההרצה נכשלה");
          }
        }}
      >
        הפעלת ייבוא ובדיקת מחירים עכשיו
      </button>
      <p className="dp-muted" role="status">
        {state === "…" ? "מריץ (עד דקה)…" : state}
      </p>
    </div>
  );
}

export function PublishToggle({ productId, unpublish }: { productId: string; unpublish: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="dp-btn dp-btn-small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post({ action: unpublish ? "unpublish" : "republish", productId }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
    >
      {unpublish ? "הוצאה מפרסום" : "החזרה לפרסום"}
    </button>
  );
}
