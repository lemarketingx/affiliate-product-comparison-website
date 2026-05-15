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
        eyebrow="מאמר"
        title={`מאמר: ${slug}`}
        description="נתיב המאמר הדינמי מוכן לתוכן בעברית, מטא-דאטה ומבנה קריא למדריכי קנייה."
      />
      <Container className="py-10">
        <EmptyState
          title="מדריך קנייה יופיע כאן"
          description="תוכן המאמר יתחבר בהמשך ממקור תוכן אמיתי, בלי לפרסם מדריכים מדומים."
        />
      </Container>
    </AppShell>
  );
}
