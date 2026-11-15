import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "../../public-shell";
import { GUIDES } from "../../../lib/preflight/guides";
import { visibility } from "../../../lib/preflight/approvals";
import { ClaimList, DraftBanner } from "../../_preflight/claim";

export const dynamic = "force-dynamic";
function find(slug: string) {
  const g = GUIDES.find((g) => g.slug === slug);
  if (!g) return null;
  const v = visibility("guide:" + g.slug);
  return v.visible ? { ...g, status: v.status } : null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  return { title: g ? g.title + " | DealPilot" : "מדריך לא נמצא | DealPilot" };
}
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  if (!g) notFound();
  const sources = new Map(
    g.sections.flatMap((s) => s.claims).flatMap((c) => (c.source ? [[c.source.url, c.source] as const] : [])),
  );
  return (
    <PublicShell>
      <main id="main" className="fp-wrap">
        <article className="fp-prose fp-guide">
          <nav className="fp-crumbs" aria-label="מיקום"><Link href="/guides">קונים חכם מחו״ל</Link><span>/ <span dir="ltr">{g.code}</span></span></nav>
          <span className="fp-kicker">מדריך <span dir="ltr">{g.code}</span> · עודכן {g.updatedAt}</span>
          <h1>{g.title}</h1>
          <p>{g.summary}</p>
          <DraftBanner status={g.status} />
          {g.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              <ClaimList claims={s.claims} />
            </section>
          ))}
          <h2>מקורות</h2>
          {sources.size ? (
            <ul>
              {[...sources.values()].map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> · נבדק {s.checkedAt}</li>
              ))}
            </ul>
          ) : (
            <p>המדריך מבוסס על ידע כללי. טענות שתלויות בישראל מסומנות &quot;נדרש אימות&quot;.</p>
          )}
          <p className="fp-fine">תווית &quot;נדרש אימות&quot; פירושה שלא מצאנו מקור רשמי עדכני לטענה. אל תסתמכו עליה בלי לבדוק.</p>
        </article>
      </main>
    </PublicShell>
  );
}
