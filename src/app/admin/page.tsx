import { AppShell } from "@/components/app-shell";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function AdminPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="ניהול"
        title="מעטפת ניהול מוכנה להמשך."
        description="האזור שמור לניהול מוצרים, דילים, קטגוריות ותוכן לאחר הוספת הרשאות וחיבורי נתונים."
      />
      <Container className="py-10">
        <EmptyState
          title="אזור הניהול עדיין לא פעיל"
          description="כלי עריכה, הרשאות וחיבורי נתונים יתווספו בהמשך בצורה מאובטחת."
        />
      </Container>
    </AppShell>
  );
}
