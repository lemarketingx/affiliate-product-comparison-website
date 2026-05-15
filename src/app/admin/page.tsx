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
          title="כלי הניהול עדיין לא פעילים"
          description="לפני שימוש אמיתי צריך להוסיף התחברות, הרשאות, טפסים מאובטחים ופעולות שרת."
        />
      </Container>
    </AppShell>
  );
}
