import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Product"
        title={`Product detail: ${id}`}
        description="The product detail route is prepared for specs, merchant offers, pros and cons, disclosures, and related comparisons."
      />
      <Container className="py-10">
        <EmptyState
          title="Product data is not connected"
          description="Keep this route API-free until source-of-truth product and affiliate attribution rules are finalized."
        />
      </Container>
    </AppShell>
  );
}
