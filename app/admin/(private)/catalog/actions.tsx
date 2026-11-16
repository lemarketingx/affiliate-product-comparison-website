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

const JOB_LABEL = { discover: "ייבוא מוצרים עכשיו", prices: "בדיקת מחירים עכשיו" } as const;

/** One button per job: an import never spends price-check calls, and vice versa. */
export function RunJobButton({ disabled, job }: { disabled: boolean; job: "discover" | "prices" }) {
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
            const { ok, data } = await post({ action: "run", job });
            if (!ok) setState(data.code === "RUN_IN_PROGRESS" ? "הרצה אחרת עדיין פועלת. נסו שוב בעוד דקה." : "ההרצה נכשלה: " + (data.code ?? "UNKNOWN"));
            else if (job === "discover")
              setState(`ייבוא: ${data.discovery.status} · ${data.discovery.stats.calls} קריאות · ${data.discovery.stats.publishedNew} מוצרים חדשים פורסמו`);
            else
              setState(`מחירים: ${data.prices.status} · ${data.prices.stats.calls} קריאות · ${data.prices.stats.updated} עודכנו · ${data.prices.stats.confirmed ?? 0} אומתו`);
            router.refresh();
          } catch {
            setState("ההרצה נכשלה");
          }
        }}
      >
        {JOB_LABEL[job]}
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
