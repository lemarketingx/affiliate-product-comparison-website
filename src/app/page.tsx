import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { architectureCards, siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <AppShell>
      <section className="bg-surface">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Affiliate platform foundation
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
              Build comparison journeys on a clean Next.js base.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              {siteConfig.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/deals"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                View deal structure
              </Link>
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-semibold transition hover:bg-surface-muted"
              >
                Open admin shell
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="rounded-lg border border-border bg-background p-4">
            <div className="rounded-md bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="h-3 w-24 rounded bg-accent-soft" />
                  <div className="mt-3 h-6 w-48 rounded bg-surface-muted" />
                </div>
                <div className="h-9 w-24 rounded-md bg-accent" />
              </div>
              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-md border border-border p-3">
                    <div className="h-20 rounded bg-surface-muted" />
                    <div className="mt-4 h-3 w-3/4 rounded bg-border" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-border" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section>
        <Container className="grid gap-4 py-10 sm:grid-cols-3 sm:py-14">
          {architectureCards.map((card) => (
            <article key={card.title} className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{card.description}</p>
            </article>
          ))}
        </Container>
      </section>
    </AppShell>
  );
}
