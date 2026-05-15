import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { ProductCard } from "@/components/shopping-ui";

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
      <Container className="grid gap-5 py-7 lg:grid-cols-[320px_1fr]">
        <ProductCard title="מוצר מומלץ" description="המחיר יתעדכן אוטומטית" />
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border">
          <p className="text-sm font-black text-accent">בדיקת מוצר</p>
          <h2 className="mt-2 text-2xl font-black text-navy">פרטי מוצר יופיעו כאן</h2>
          <p className="mt-3 leading-7 text-muted">
            מפרט, מחיר, דירוג וקישור אפיליאייט יופיעו רק לאחר חיבור מקור נתונים אמיתי.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["מחיר", "דירוג", "משלוח"].map((item) => (
              <div key={item} className="rounded-2xl bg-surface-muted p-4">
                <p className="text-sm font-black text-navy">{item}</p>
                <p className="mt-2 text-sm text-muted">יתעדכן אוטומטית</p>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </AppShell>
  );
}
