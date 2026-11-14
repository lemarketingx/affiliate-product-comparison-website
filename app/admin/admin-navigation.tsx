"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  Radar,
  FileText,
  Radio,
  Workflow,
  Settings2,
  ReceiptText,
  ChevronDown,
  Menu,
} from "lucide-react";

const navigation = [
  ["dashboard", "סקירה כללית", LayoutDashboard],
  ["products", "בדיקת מוצרים", PackageSearch],
  ["discovery", "Product Scout", Radar],
  ["content", "סטודיו תוכן", FileText],
  ["channels", "ערוצי הפצה", Radio],
  ["orders", "הזמנות ועמלות", ReceiptText],
  ["automations", "אוטומציות", Workflow],
  ["settings", "הגדרות", Settings2],
] as const;

export default function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const current =
    navigation.find(([path]) => pathname === `/admin/${path}`)?.[1] ??
    "מרכז שליטה";
  return (
    <div
      className="dp-admin-navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="dp-admin-nav-toggle"
        aria-expanded={open}
        aria-controls="dp-admin-navigation-links"
        onClick={() => setOpen((value) => !value)}
      >
        <Menu size={18} aria-hidden="true" />
        <span>
          תפריט ניהול <small>· {current}</small>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <nav
        id="dp-admin-navigation-links"
        className={open ? "is-open" : ""}
        aria-label="ניהול DealPilot"
      >
        {navigation.map(([path, label, Icon]) => (
          <Link
            key={path}
            href={`/admin/${path}`}
            aria-current={pathname === `/admin/${path}` ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
