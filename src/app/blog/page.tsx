import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function BlogPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Blog"
        title="Editorial hub ready for buying guides."
        description="Use this route for comparison explainers, category guides, and affiliate disclosure-friendly content."
      />
      <Container className="py-10">
        <EmptyState
          title="No articles published yet"
          description="The blog index is ready for CMS or filesystem content when the content workflow is chosen."
        />
        <div className="mt-6 text-center text-sm text-muted">
          Dynamic article route example:{" "}
          <Link href="/blog/example-slug" className="font-semibold text-accent hover:text-accent-strong">
            /blog/[slug]
          </Link>
        </div>
      </Container>
    </AppShell>
  );
}
