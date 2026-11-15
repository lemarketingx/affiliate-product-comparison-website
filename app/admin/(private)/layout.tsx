import Link from "next/link";
import { ArrowUpLeft, Navigation } from "lucide-react";
import { requireAdmin } from "../../../lib/dealpilot/auth";
import { WorkbenchProvider } from "../product-workbench";
import { LogoutButton } from "../auth-controls";
import AdminNavigation from "../admin-navigation";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <WorkbenchProvider>
      <div className="dp-admin">
        <aside className="dp-sidebar">
          <Link className="dp-brand" href="/admin/dashboard">
            <Navigation aria-hidden="true" />
            <b dir="ltr">
              deal<span>pilot</span>
            </b>
          </Link>
          <p className="dp-muted">מרכז שליטה פרטי</p>
          <AdminNavigation />
          <div className="dp-sidebar-bottom">
            <Link href="/">
              לאתר הציבורי <ArrowUpLeft size={16} />
            </Link>
            <LogoutButton />
          </div>
        </aside>
        <main className="dp-admin-main" id="main-content">
          <div className="dp-notice">
            סביבת עבודה פרטית · החלטות ותוכן נשמרים בזיכרון הלשונית בלבד · פרסום
            אוטומטי כבוי
          </div>
          {children}
        </main>
      </div>
    </WorkbenchProvider>
  );
}
