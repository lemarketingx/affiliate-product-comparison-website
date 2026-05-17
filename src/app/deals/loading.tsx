import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";

export default function DealsLoading() {
  return (
    <AppShell>
      <div className="h-40 animate-pulse bg-surface-muted" />
      <Container className="py-7">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-full bg-surface-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="min-h-[330px] animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
