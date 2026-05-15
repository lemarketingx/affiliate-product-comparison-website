import Link from "next/link";
import { categoryChips } from "@/lib/site";

type ProductCardProps = {
  badge?: string;
  title?: string;
  description?: string;
  href?: string;
  tone?: "sage" | "dark" | "cream" | "silver";
};

const toneStyles = {
  sage: "from-[#c9d8ce] via-[#7c9088] to-[#1a2d2b]",
  dark: "from-[#0b111c] via-[#2c3b48] to-[#030712]",
  cream: "from-[#fff6e8] via-[#e6d1b6] to-[#8b7358]",
  silver: "from-[#f9fafb] via-[#cbd5e1] to-[#475569]",
};

export function SearchPanel() {
  return (
    <form className="rounded-2xl bg-white p-2 shadow-xl shadow-navy/10 ring-1 ring-border" role="search">
      <label htmlFor="homepage-search" className="sr-only">
        חיפוש מוצר
      </label>
      <div className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-3">
        <span aria-hidden="true" className="text-xl text-muted">
          ⌕
        </span>
        <input
          id="homepage-search"
          name="q"
          type="search"
          placeholder="חפשו מוצר, רעיון למתנה או גאדג׳ט מעניין..."
          className="min-h-11 flex-1 border-0 bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-muted sm:text-base"
        />
      </div>
    </form>
  );
}

export function CategoryChips() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3 py-1">
        {categoryChips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className={`min-h-10 rounded-full px-5 py-2 text-sm font-black shadow-sm transition ${
              "active" in chip && chip.active
                ? "bg-accent text-white"
                : "bg-surface-muted text-muted hover:bg-navy-soft hover:text-navy"
            }`}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProductCard({
  badge = "מומלץ",
  title = "מוצר מומלץ",
  description = "המחיר יתעדכן אוטומטית",
  href = "/product/placeholder",
  tone = "sage",
}: ProductCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[330px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-accent/40"
    >
      <div className={`relative aspect-[4/5] bg-gradient-to-br ${toneStyles[tone]}`}>
        <span className="absolute right-3 top-3 rounded-full bg-navy/85 px-3 py-1 text-xs font-black text-white">
          {badge}
        </span>
        <div className="absolute inset-x-6 bottom-8 h-16 rounded-full bg-white/20 blur-xl" />
        <div className="absolute inset-8 rounded-full border border-white/25 bg-white/10 shadow-inner" />
      </div>
      <div className="flex flex-1 flex-col p-4 text-center">
        <h3 className="text-base font-black leading-6 text-navy">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <span className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-black text-white transition group-hover:bg-accent-strong">
          בדיקת מוצר
        </span>
      </div>
    </Link>
  );
}

export function ViralCard({
  title,
  label,
  tone,
}: {
  title: string;
  label: string;
  tone: "neon" | "warm";
}) {
  const style =
    tone === "neon"
      ? "from-[#02111f] via-[#062b3a] to-[#030712]"
      : "from-[#ffe1c2] via-[#d7b696] to-[#4c3628]";

  return (
    <Link
      href="/deals"
      className={`relative flex min-h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${style} p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl`}
    >
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-navy">
        {label}
      </span>
      <div className="absolute inset-x-8 top-8 h-20 rounded-full bg-white/15 blur-2xl" />
      <h3 className="relative mt-auto max-w-40 text-lg font-black leading-7">{title}</h3>
    </Link>
  );
}

export function GuideRow({ title, description }: { title: string; description: string }) {
  return (
    <Link
      href="/blog"
      className="grid grid-cols-[84px_1fr] items-center gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square rounded-xl bg-gradient-to-br from-surface-muted to-border" />
      <div>
        <h3 className="text-sm font-black leading-6 text-navy">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </Link>
  );
}
