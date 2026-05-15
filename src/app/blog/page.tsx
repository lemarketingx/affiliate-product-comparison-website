import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { GuideRow, ViralCard } from "@/components/shopping-ui";
import { guidePreviews, viralStories } from "@/lib/site";

export default function BlogPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="מדריכים"
        title="מרכז תוכן למדריכי קנייה והשוואות."
        description="כאן יופיעו בהמשך מדריכים בעברית שיעזרו להבין קטגוריות, לקרוא מפרטים ולקבל החלטה רגועה יותר."
      />
      <Container className="grid gap-6 py-7 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid grid-cols-2 gap-4">
          {viralStories.map((story) => (
            <ViralCard key={story.title} title={story.title} label={story.label} tone={story.tone} />
          ))}
        </div>
        <div className="grid gap-3">
          {guidePreviews.map((guide) => (
            <GuideRow key={guide.title} title={guide.title} description={guide.description} />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
