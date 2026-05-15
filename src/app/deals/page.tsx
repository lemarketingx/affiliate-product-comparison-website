import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { CategoryChips, ProductCard } from "@/components/shopping-ui";
import { placeholderDeals } from "@/lib/site";

export default function DealsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="דילים"
        title="מרכז הדילים מוכן לחיבור מקורות."
        description="כאן יוצגו בהמשך מבצעים מסוננים, מחירים, דירוגים וקישורי אפיליאייט עם גילוי נאות ברור."
      />
      <Container className="py-7">
        <CategoryChips />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {placeholderDeals.map((deal) => (
            <ProductCard
              key={`${deal.badge}-${deal.tone}`}
              badge={deal.badge}
              title={deal.title}
              description={deal.description}
              tone={deal.tone}
            />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
