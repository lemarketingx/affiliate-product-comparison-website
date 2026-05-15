import { Container } from "./container";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-10 sm:py-14">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          {description}
        </p>
      </Container>
    </section>
  );
}
