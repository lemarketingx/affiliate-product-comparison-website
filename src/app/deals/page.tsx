import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function DealsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Deals"
        title="Deal listing route ready for future feeds."
        description="This page is intentionally data-free until affiliate sources, editorial rules, and tracking requirements are connected."
      />
      <Container className="py-10">
        <EmptyState
          title="No deals connected yet"
          description="Use this screen later for curated offers, price history, merchant metadata, and disclosure-safe affiliate links."
        />
      </Container>
    </AppShell>
  );
}
