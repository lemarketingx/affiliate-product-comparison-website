import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Category"
        title={`Category: ${slug}`}
        description="Dynamic category routing is ready for comparison groups, filters, and buying-guide content."
      />
      <Container className="py-10">
        <EmptyState
          title="Category content is not connected"
          description="Add category models, product queries, and filtering logic when the data layer is defined."
        />
      </Container>
    </AppShell>
  );
}
