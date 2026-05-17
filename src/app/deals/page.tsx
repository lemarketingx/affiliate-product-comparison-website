import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CategoryChips, ProductCard } from "@/components/shopping-ui";
import { getHotProducts, searchProducts, type NormalizedProduct } from "@/lib/aliexpress";
import { placeholderDeals } from "@/lib/site";

async function fetchDealsProducts(q?: string): Promise<NormalizedProduct[]> {
  try {
    const products = q
      ? await searchProducts({ keywords: q, page_size: 8 })
      : await getHotProducts({ page_size: 8 });
    console.info("[deals] fetched", products.length, "products", q ? `for query "${q}"` : "(hot)");
    return products;
  } catch (err) {
    console.error("[deals] product fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

const tones = ["sage", "dark", "cream", "silver"] as const;

type DealsPageProps = {
  searchParams: Promise<Record<string, string>>;
};

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const { q } = await searchParams;
  const products = await fetchDealsProducts(q);
  const hasProducts = products.length > 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="דילים"
        title={q ? `תוצאות עבור: ${q}` : "דילים חמים"}
        description="מוצרים מעניינים עם מחירים, דירוגים וקישורי אפיליאייט."
      />
      <Container className="py-7">
        <CategoryChips />
        {hasProducts ? (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard
                key={product.id ?? `product-${i}`}
                tone={tones[i % tones.length]}
                product={product}
              />
            ))}
          </div>
        ) : (
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
        )}
        {!hasProducts && (
          <div className="mt-8">
            <EmptyState
              title="לא נמצאו מוצרים"
              description="לא הצלחנו לטעון מוצרים כרגע. נסו לחפש מחדש או חזרו מאוחר יותר."
            />
          </div>
        )}
      </Container>
    </AppShell>
  );
}
