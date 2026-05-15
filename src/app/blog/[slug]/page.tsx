import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Article"
        title={`Article: ${slug}`}
        description="Dynamic blog article routing is in place without binding the app to a CMS or content API."
      />
      <Container className="py-10">
        <EmptyState
          title="Article content is not connected"
          description="Add content loading, metadata generation, and structured data once the editorial source is selected."
        />
      </Container>
    </AppShell>
  );
}
