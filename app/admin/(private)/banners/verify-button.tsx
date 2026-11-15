"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<string>("");
  return (
    <div>
      <button
        type="button"
        className="dp-btn"
        disabled={disabled || state === "…"}
        onClick={async () => {
          setState("…");
          try {
            const res = await fetch("/api/admin/banners", { method: "POST" });
            const data = await res.json();
            setState(res.ok ? `נבדקו ${data.checked} קישורים · ${data.ok} הפנו ל־AliExpress` : "הבדיקה נכשלה: " + data.code);
            router.refresh();
          } catch {
            setState("הבדיקה נכשלה");
          }
        }}
      >
        בדיקת הפניות של קישורי הבאנרים
      </button>
      <p className="dp-muted" role="status">{state === "…" ? "בודק…" : state}</p>
    </div>
  );
}
