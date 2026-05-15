import Link from "next/link";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  actionHref,
}: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-black text-accent">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-black leading-tight text-navy sm:text-3xl">
          {title}
        </h2>
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="shrink-0 text-sm font-black text-accent transition hover:text-accent-strong"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
