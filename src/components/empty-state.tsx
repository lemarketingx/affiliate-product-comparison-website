type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-accent-soft text-lg font-black text-accent-strong">
        +
      </div>
      <h2 className="text-xl font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-strong"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
