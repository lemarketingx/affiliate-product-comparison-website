import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{siteConfig.name}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-3 text-sm">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
