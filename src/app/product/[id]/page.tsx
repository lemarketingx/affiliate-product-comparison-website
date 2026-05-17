import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { getProductDetails, type NormalizedProduct } from "@/lib/aliexpress";

async function fetchProduct(id: string): Promise<NormalizedProduct | null> {
  try {
    const products = await getProductDetails({ product_ids: id });
    const product = products[0] ?? null;
    console.info(`[product:${id}]`, product ? "found" : "not found");
    return product;
  } catch (err) {
    console.error(`[product:${id}] fetch failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProduct(id);

  const title = product?.title ?? `מוצר ${id}`;
  const price = product?.price ? `$${product.price}` : "—";
  const originalPrice = product?.originalPrice ? `$${product.originalPrice}` : null;
  const rating = product?.rating ?? "—";
  const orders = product?.orders?.toLocaleString() ?? "—";
  const affiliateUrl = product?.affiliateUrl ?? product?.productUrl ?? null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="מוצר"
        title={title}
        description={product ? `מחיר: ${price}` : "פרטי מוצר יופיעו כאן לאחר חיבור מקור נתונים."}
      />
      <Container className="grid gap-5 py-7 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
          {product?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.image}
              alt={title}
              className="h-80 w-full object-cover lg:h-full"
              loading="eager"
            />
          ) : (
            <div className="flex h-80 items-center justify-center bg-gradient-to-br from-navy-soft via-white to-accent-soft lg:h-full">
              <span className="text-4xl">🛒</span>
            </div>
          )}
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border">
          <p className="text-sm font-black text-accent">בדיקת מוצר</p>
          <h2 className="mt-2 text-2xl font-black text-navy">{title}</h2>

          {product ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="text-sm font-black text-navy">מחיר</p>
                  <p className="mt-2 text-lg font-black text-accent">{price}</p>
                  {originalPrice && originalPrice !== price && (
                    <p className="mt-1 text-xs text-muted line-through">{originalPrice}</p>
                  )}
                </div>
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="text-sm font-black text-navy">דירוג</p>
                  <p className="mt-2 text-lg font-black text-navy">{rating}</p>
                </div>
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="text-sm font-black text-navy">הזמנות</p>
                  <p className="mt-2 text-lg font-black text-navy">{orders}</p>
                </div>
              </div>

              {affiliateUrl && (
                <div className="mt-6">
                  <Link
                    href={affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-6 text-base font-black text-white transition hover:bg-accent-strong"
                  >
                    לרכישה באליאקספרס
                  </Link>
                  <p className="mt-3 text-center text-xs text-muted">
                    קישור אפיליאייט — ייתכן שנקבל עמלה על רכישה, ללא עלות נוספת לכם.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 leading-7 text-muted">
                מוצר זה אינו זמין כרגע או שהמזהה אינו תקין.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["מחיר", "דירוג", "משלוח"].map((item) => (
                  <div key={item} className="rounded-2xl bg-surface-muted p-4">
                    <p className="text-sm font-black text-navy">{item}</p>
                    <p className="mt-2 text-sm text-muted">—</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href="/deals"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-6 text-base font-black text-white transition hover:bg-accent-strong"
                >
                  לחיפוש מוצרים אחרים
                </Link>
              </div>
            </>
          )}
        </section>
      </Container>
    </AppShell>
  );
}
