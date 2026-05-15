import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="grid size-9 place-items-center rounded-md bg-accent text-sm font-bold text-white">
            AC
          </span>
          <span className="text-base">{siteConfig.name}</span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
