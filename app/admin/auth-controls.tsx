"use client";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
export function LoginButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="dp-btn"
      onClick={() => {
        setBusy(true);
        void signIn("github", { callbackUrl: "/admin/dashboard" }).finally(() =>
          setBusy(false),
        );
      }}
    >
      {busy ? "מעבר להתחברות…" : "כניסה מאובטחת עם GitHub"}
    </button>
  );
}
export function LogoutButton() {
  return (
    <button
      className="dp-btn dp-btn-secondary"
      onClick={() => void signOut({ callbackUrl: "/admin/login" })}
    >
      יציאה מהמערכת
    </button>
  );
}
