import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function AdminPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Admin workspace shell."
        description="This private-workflow route is scaffolded for future product, deal, category, and content management screens."
      />
      <Container className="py-10">
        <EmptyState
          title="Admin tools are not implemented"
          description="Authentication, permissions, forms, and API mutations should be added before this route manages production data."
        />
      </Container>
    </AppShell>
  );
}
