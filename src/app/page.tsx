export const revalidate = 3600; // refresh hot products every hour

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import {
  CategoryChips,
  GuideRow,
  ProductCard,
  SearchPanel,
  ViralCard,
} from "@/components/shopping-ui";
import {
  categoryCards,
  guidePreviews,
  placeholderDeals,
  trustItems,
  viralStories,
} from "@/lib/site";
import { getHotProducts, type NormalizedProduct } from "@/lib/aliexpress";

async function fetchHotProducts(): Promise<NormalizedProduct[]> {
  try {
    const products = await getHotProducts({ page_size: 4 });
    console.info("[home] fetched", products.length, "hot products");
    return products;
  } catch (err) {
    console.error("[home] hot products fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

const tones = ["sage", "dark", "cream", "silver"] as const;

export default async function Home() {
  const hotProducts = await fetchHotProducts();
  const hasRealProducts = hotProducts.length > 0;

  return (
    <AppShell>
      <section className="bg-[#fbfaf9]">
        <Container className="py-8 sm:py-12">
          <div className="mx-auto max-w-md text-center sm:max-w-2xl">
            <p className="text-sm font-black text-accent">מנוע גילוי דילים חכם</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-navy sm:text-6xl">
              מגלים מוצרים שווים. קונים חכם.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
              מוצרים מעניינים, דילים חמים והמלצות קנייה ממוקדות במקום אחד.
            </p>
          </div>

          <div className="mx-auto mt-7 max-w-xl">
            <SearchPanel />
          </div>

          <div className="mx-auto mt-6 max-w-3xl">
            <CategoryChips />
          </div>
        </Container>
      </section>

      <section className="bg-[#fbfaf9]">
        <Container className="py-5 sm:py-8">
          <SectionHeading
            eyebrow="חכם עכשיו"
            title="הכי חמים עכשיו"
            actionLabel="צפה בהכל"
            actionHref="/deals"
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {hasRealProducts
              ? hotProducts.map((product, i) => (
                  <ProductCard
                    key={product.id ?? `hot-${i}`}
                    tone={tones[i % tones.length]}
                    product={product}
                  />
                ))
              : placeholderDeals.map((deal) => (
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
      </section>

      <section className="bg-[#fbfaf9]">
        <Container className="py-7 sm:py-10">
          <SectionHeading eyebrow="קטגוריות" title="קפיצה מהירה למה שמעניין" />
          <div className="grid gap-3 sm:grid-cols-3">
            {categoryCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-accent/40"
              >
                <div className="mb-4 h-20 rounded-2xl bg-gradient-to-br from-navy-soft via-white to-accent-soft" />
                <h3 className="text-lg font-black text-navy">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
                <span className="mt-4 inline-flex text-sm font-black text-accent group-hover:text-accent-strong">
                  לפתיחת קטגוריה
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#fbfaf9]">
        <Container className="py-7 sm:py-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-navy">תגליות ויראליות</h2>
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
              חי
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {viralStories.map((story) => (
              <ViralCard
                key={story.title}
                title={story.title}
                label={story.label}
                tone={story.tone}
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#fbfaf9]">
        <Container className="py-7 sm:py-10">
          <SectionHeading
            eyebrow="מדריכים"
            title="מדריכי קנייה"
            actionLabel="לבלוג"
            actionHref="/blog"
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {guidePreviews.map((guide) => (
              <GuideRow key={guide.title} title={guide.title} description={guide.description} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#fbfaf9]">
        <Container className="py-7 sm:py-12">
          <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border sm:grid-cols-3 sm:p-6">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-lg font-black text-accent shadow-sm">
                  ✓
                </span>
                <p className="text-sm font-black leading-6 text-navy">{item}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-6 text-muted">
            חלק מהקישורים באתר עשויים להיות קישורי אפיליאייט. ייתכן שנקבל עמלה אם תבחרו לרכוש דרך קישור, ללא עלות נוספת עבורכם.
          </p>
        </Container>
      </section>
    </AppShell>
  );
}
