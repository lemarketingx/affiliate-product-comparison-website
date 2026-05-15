import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { CategoryChips, ProductCard } from "@/components/shopping-ui";
import { placeholderDeals } from "@/lib/site";

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
      <Container className="py-7">
        <CategoryChips />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {placeholderDeals.map((deal) => (
            <ProductCard
              key={`${deal.badge}-${deal.tone}`}
              badge={deal.badge}
              title={deal.title}
              description="בדיקת מוצר"
              tone={deal.tone}
            />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
