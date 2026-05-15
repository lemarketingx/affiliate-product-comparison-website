import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#fbfaf9] pb-20 text-navy sm:pb-0">
      <Container className="flex flex-col gap-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-right">
        <div>
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.tagline}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            חלק מהקישורים באתר עשויים להיות קישורי אפיליאייט. ייתכן שנקבל עמלה ללא עלות נוספת עבורכם.
          </p>
        </div>
        <nav aria-label="ניווט תחתון" className="flex flex-wrap justify-center gap-3 text-sm sm:justify-start">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="font-bold text-muted hover:text-navy">
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
      <nav
        aria-label="ניווט מהיר"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 shadow-[0_-10px_30px_rgba(15,31,56,0.08)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 px-3 py-2 text-center text-xs font-black text-muted">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-2 py-2 transition hover:bg-surface-muted hover:text-navy"
            >
              <span className="mx-auto mb-1 block size-5 rounded-md border border-current" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </footer>
  );
}
