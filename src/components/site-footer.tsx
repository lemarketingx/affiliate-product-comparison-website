import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-navy text-white">
      <Container className="flex flex-col gap-8 py-9 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="mt-1 text-sm text-white/70">{siteConfig.tagline}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
            חלק מהקישורים באתר עשויים להיות קישורי אפיליאייט. ייתכן שנקבל עמלה ללא עלות נוספת עבורכם.
          </p>
        </div>
        <nav aria-label="ניווט תחתון" className="flex flex-wrap gap-3 text-sm">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-white/70 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
