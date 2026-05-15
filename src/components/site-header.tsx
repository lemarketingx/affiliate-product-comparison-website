import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#fbfaf9]/95 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-surface-muted text-xl font-black text-navy ring-1 ring-border"
          >
            ≡
          </span>
          <span className="text-lg font-black tracking-tight text-navy">{siteConfig.name}</span>
        </Link>
        <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-bold text-muted transition hover:bg-navy-soft hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/deals"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-black text-white shadow-sm transition hover:bg-accent-strong"
        >
          דילים
        </Link>
      </Container>
    </header>
  );
}
