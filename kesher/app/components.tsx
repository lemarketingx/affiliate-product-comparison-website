"use client";
import { useEffect, useRef } from "react";
import { X, Check, Copy, ArrowUpLeft, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import type { LeadStatus } from "../lib/domain";
import { STATUS } from "../lib/domain";
export function Brand({ light = false, name = "קשר" }: { light?: boolean; name?: string }) {
  return <div className={"brand " + (light ? "brand-light" : "")}><span className="brand-symbol"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M7 24 16 14l8 8 9-11M7 32l9-10 8 8 9-11" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>{name}<small>שותפים להצלחה</small></span></div>;
}
export function Avatar({ name, index = 0, small = false }: { name: string; index?: number; small?: boolean }) {
  return <span className={"avatar avatar-" + index % 5 + (small ? " avatar-small" : "")} aria-hidden="true">{name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>;
}
export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={"status status-" + status}><i />{STATUS[status]}</span>;
}
export function Empty({ title = "כאן יתחילו להיווצר קשרים", text = "ההפניות שלכם יופיעו כאן ברגע שיתקבלו.", action }: { title?: string; text?: string; action?: ReactNode }) {
  return <div className="empty"><span className="empty-icon"><Link2 size={28}/></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const cancel = (e: Event) => { e.preventDefault(); closeRef.current(); };
    node?.addEventListener("cancel", cancel);
    return () => { node?.removeEventListener("cancel", cancel); node?.close(); };
  }, []);
  return <dialog ref={dialog} aria-label={title} className={"modal " + (wide ? "modal-wide" : "")} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="סגירה" onClick={onClose}><X size={20}/></button></div>
    <div className="modal-body">{children}</div>
  </dialog>;
}
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const el = document.createElement("textarea");
  el.value = text; el.style.position = "fixed"; el.style.opacity = "0"; document.body.appendChild(el); el.select();
  const ok = document.execCommand("copy"); el.remove(); if (!ok) throw new Error("לא ניתן להעתיק בדפדפן זה.");
}
export function CopyButton({ text, label = "העתקת קישור", onCopied, primary = false }: { text: string; label?: string; onCopied: (message: string) => void; primary?: boolean }) {
  return <button className={primary ? "btn btn-primary" : "btn btn-light"} onClick={async () => { try { await copyText(text); onCopied("הועתק ללוח"); } catch { onCopied("לא ניתן להעתיק כרגע. אפשר לסמן ולהעתיק את הטקסט."); } }}><Copy size={16}/>{label}</button>;
}
export function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-link" onClick={onClick}>{children}<ArrowUpLeft size={15}/></button>;
}
export function Success({ children }: { children: ReactNode }) {
  return <div className="success-state"><span><Check size={30}/></span><h2>הפרטים התקבלו בהצלחה</h2><p>{children}</p></div>;
}
