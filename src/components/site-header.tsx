import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-h-11 items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-lg bg-navy text-sm font-bold text-white shadow-sm">
            הש
          </span>
          <span className="text-lg text-navy">{siteConfig.name}</span>
        </Link>
        <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-navy-soft hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/deals"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-white shadow-sm transition hover:bg-accent-strong"
        >
          מצאו דילים
        </Link>
      </Container>
    </header>
  );
}
