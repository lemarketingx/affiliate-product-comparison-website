"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/brands", label: "מותגים", mobile: "מותגים" },
  { href: "/deals", label: "מוצרי מותגים", mobile: "מוצרי מותגים" },
  { href: "/categories", label: "קטגוריות", mobile: "כל הקטגוריות" },
  { href: "/guides", label: "מדריכים", mobile: "מדריכים" },
] as const;

/** Main navigation with the current section marked (aria-current). */
export default function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname() ?? "/";
  return (
    <>
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {mobile ? l.mobile : l.label}
          </Link>
        );
      })}
    </>
  );
}
