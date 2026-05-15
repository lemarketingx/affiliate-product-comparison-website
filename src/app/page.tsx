import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { categoryCards, howItWorks } from "@/lib/site";

const placeholderDeals = ["דיל מוביל", "בחירת מערכת", "משלוח משתלם"];

export default function Home() {
  return (
    <AppShell>
      <section className="bg-navy text-white">
        <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-orange-100 ring-1 ring-white/15">
              השוואות מוצרים בעברית, בצורה נקייה ושקופה
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              מוצאים דילים טובים יותר בלי לפתוח עשרים טאבים.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">
              אתר השוואות אפיליאייט ישראלי שמרכז קטגוריות, מדריכי קנייה ודילים עתידיים במבנה מהיר, אמין ונוח לקריאה.
            </p>
            <form className="mt-8 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20" role="search">
              <label htmlFor="home-search" className="sr-only">
                חיפוש מוצר או קטגוריה
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="חפשו מוצר, קטגוריה או מדריך קנייה"
                  className="min-h-12 flex-1 rounded-xl border border-transparent bg-surface-muted px-4 text-base text-navy outline-none transition placeholder:text-muted focus:border-accent focus:bg-white"
                />
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-strong"
                >
                  חיפוש
                </button>
              </div>
            </form>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm text-white/75">
              <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
                שקיפות בקישורים
              </div>
              <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
                מותאם לנייד
              </div>
              <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
                בלי עומס מיותר
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 text-navy shadow-2xl shadow-black/25">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-bold text-accent">תצוגת השוואה</p>
                  <p className="mt-1 text-xl font-black">מוכן לחיבור נתונים</p>
                </div>
                <Link
                  href="/deals"
                  className="rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-navy/90"
                >
                  לדילים
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {placeholderDeals.map((label) => (
                  <div key={label} className="rounded-2xl border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold">{label}</p>
                        <p className="mt-1 text-sm text-muted">מקום שמור למוצר עתידי</p>
                      </div>
                      <div className="h-10 w-24 rounded-lg bg-accent-soft" />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-surface-muted">
                      <div className="h-2 w-2/3 rounded-full bg-accent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-background">
        <Container className="py-10 sm:py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-accent">קטגוריות</p>
              <h2 className="mt-2 text-3xl font-black text-navy">מתחילים מהמקום הנכון</h2>
            </div>
            <Link href="/deals" className="text-sm font-bold text-accent hover:text-accent-strong">
              כל הדילים העתידיים
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categoryCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
              >
                <div className="mb-5 h-28 rounded-xl bg-[linear-gradient(135deg,#10213d_0%,#10213d_55%,#f97316_55%,#f97316_100%)]" />
                <h3 className="text-xl font-black text-navy">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{card.description}</p>
                <span className="mt-5 inline-flex text-sm font-bold text-accent group-hover:text-accent-strong">
                  לפתיחת קטגוריה
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface">
        <Container className="grid gap-8 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:py-14">
          <div>
            <p className="text-sm font-bold text-accent">דילים נבחרים</p>
            <h2 className="mt-2 text-3xl font-black text-navy">אזור מוכן להצגת מבצעים</h2>
            <p className="mt-4 leading-7 text-muted">
              אין כאן מוצרים מדומים. המבנה מוכן להצגה עתידית של מחיר נוכחי, מחיר מקורי, דירוג, כמות הזמנות וקישור אפיליאייט.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {placeholderDeals.map((label) => (
              <article key={label} className="rounded-2xl border border-border bg-background p-4">
                <div className="aspect-square rounded-xl bg-surface-muted" />
                <p className="mt-4 font-bold text-navy">{label}</p>
                <div className="mt-3 space-y-2">
                  <div className="h-3 rounded bg-border" />
                  <div className="h-3 w-2/3 rounded bg-border" />
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-background">
        <Container className="py-10 sm:py-14">
          <p className="text-sm font-bold text-accent">איך זה עובד</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-navy text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black text-navy">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface">
        <Container className="grid gap-6 py-10 lg:grid-cols-[1fr_1fr] lg:py-14">
          <div className="rounded-2xl bg-navy p-6 text-white">
            <p className="text-sm font-bold text-orange-100">מדריכי קנייה</p>
            <h2 className="mt-3 text-3xl font-black">תוכן שיעזור לקבל החלטה</h2>
            <p className="mt-4 leading-7 text-white/75">
              אזור הבלוג מוכן למדריכים, הסברים והשוואות עומק בעברית, בלי חיבור למערכת תוכן בשלב הזה.
            </p>
            <Link
              href="/blog"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-navy transition hover:bg-orange-50"
            >
              למדריכים
            </Link>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-sm font-bold text-accent">גילוי נאות</p>
            <h2 className="mt-3 text-2xl font-black text-navy">שקיפות לפני הכול</h2>
            <p className="mt-4 leading-7 text-muted">
              בעתיד חלק מהקישורים באתר עשויים להיות קישורי אפיליאייט. המשמעות: ייתכן שנקבל עמלה אם תבחרו לרכוש דרך הקישור, ללא עלות נוספת עבורכם.
            </p>
          </div>
        </Container>
      </section>
    </AppShell>
  );
}
