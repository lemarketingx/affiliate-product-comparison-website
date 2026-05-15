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
        eyebrow="מוצר"
        title={`עמוד מוצר: ${id}`}
        description="עמוד המוצר מוכן למפרטים, מחירים, דירוגים, יתרונות וחסרונות, וקישורי אפיליאייט שקופים."
      />
      <Container className="py-10">
        <EmptyState
          title="נתוני המוצר עדיין לא מחוברים"
          description="העמוד נשאר ללא נתונים מדומים עד להגדרת מקור אמת למוצרים וכללי שיוך אפיליאייט."
        />
      </Container>
    </AppShell>
  );
}
