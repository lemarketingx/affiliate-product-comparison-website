import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function BlogPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="מדריכים"
        title="מרכז תוכן למדריכי קנייה והשוואות."
        description="כאן יופיעו בהמשך מדריכים בעברית שיעזרו להבין קטגוריות, לקרוא מפרטים ולקבל החלטה רגועה יותר."
      />
      <Container className="py-10">
        <EmptyState
          title="עדיין אין מדריכים באתר"
          description="העמוד מוכן לחיבור מערכת תוכן או קבצי תוכן, בלי לפרסם מאמרים מדומים בשלב הזה."
        />
      </Container>
    </AppShell>
  );
}
