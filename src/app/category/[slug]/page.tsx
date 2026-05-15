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
        eyebrow="קטגוריה"
        title={`קטגוריה: ${slug}`}
        description="עמוד הקטגוריה מוכן להצגת השוואות, סינונים, מדריכים ודילים לפי תחום."
      />
      <Container className="py-10">
        <EmptyState
          title="תוכן הקטגוריה עדיין לא מחובר"
          description="לא נוספו מוצרים מדומים. בהמשך ניתן לחבר מודל קטגוריות, סינון ושאילתות מוצרים."
        />
      </Container>
    </AppShell>
  );
}
