import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function DealsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="דילים"
        title="מרכז הדילים מוכן לחיבור מקורות."
        description="כאן יוצגו בהמשך מבצעים מסוננים, מחירים, דירוגים וקישורי אפיליאייט עם גילוי נאות ברור."
      />
      <Container className="py-10">
        <EmptyState
          title="עדיין אין דילים מחוברים"
          description="העמוד נשאר נקי ממוצרים מדומים עד לחיבור מקור נתונים אמיתי וכללי עריכה מסודרים."
        />
      </Container>
    </AppShell>
  );
}
