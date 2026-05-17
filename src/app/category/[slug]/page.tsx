import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CategoryChips, ProductCard } from "@/components/shopping-ui";
import { searchProducts, type NormalizedProduct } from "@/lib/aliexpress";
import { placeholderDeals } from "@/lib/site";

async function fetchCategoryProducts(slug: string): Promise<NormalizedProduct[]> {
  try {
    const products = await searchProducts({ keywords: slug, page_size: 8 });
    console.info(`[category:${slug}] fetched`, products.length, "products");
    return products;
  } catch (err) {
    console.error(`[category:${slug}] product fetch failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

const tones = ["sage", "dark", "cream", "silver"] as const;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const products = await fetchCategoryProducts(decodedSlug);
  const hasProducts = products.length > 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="קטגוריה"
        title={decodedSlug}
        description="השוואות, מחירים ודילים לפי תחום."
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
                description="בדיקת מוצר"
                tone={deal.tone}
              />
            ))}
          </div>
        )}
        {!hasProducts && (
          <div className="mt-8">
            <EmptyState
              title={`אין מוצרים בקטגוריה "${decodedSlug}"`}
              description="לא הצלחנו לטעון מוצרים לקטגוריה זו כרגע. נסו קטגוריה אחרת או חזרו מאוחר יותר."
              actionLabel="לכל הדילים"
              actionHref="/deals"
            />
          </div>
        )}
      </Container>
    </AppShell>
  );
}
