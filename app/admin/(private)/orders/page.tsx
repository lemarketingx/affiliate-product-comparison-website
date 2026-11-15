import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { orderReportsEnabled } from "../../../../lib/aliexpress/orders";
import OrderReportForm from "./report-form";
export default async function OrdersPage() {
  await requireAdmin();
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">AFFILIATE REPORTS</span>
          <h1>המספרים מגיעים מ־AliExpress.</h1>
          <p className="dp-muted">
            דוח ידני ומוגבל. AliExpress הוא מקור האמת; אין העתקה למסד נתונים.
          </p>
        </div>
      </header>
      <div className="dp-notice">
        אומדני עמלה אינם עמלה מאושרת לתשלום. סטטוס השלמת הזמנה אינו אישור לתשלום
        עמלה. אין כאן סיכום הכנסות חשבון.
      </div>
      {orderReportsEnabled() ? (
        <OrderReportForm />
      ) : (
        <section className="dp-panel">
          <h2>דוחות ההזמנות טרם הופעלו</h2>
          <p>
            המתודות אותרו בתיעוד רשמי היסטורי המסומן כישן. יש לאמת את החוזה
            הנוכחי ואת הרשאות האפליקציה לפני הפעלת בקשות דוח.
          </p>
          <p className="dp-muted">
            אחרי בדיקת הרשאות, בעל המערכת יכול להפעיל את אפשרות הדוחות בהגדרות
            השרת. לא מוצגים אפסים כתחליף לנתונים חסרים.
          </p>
        </section>
      )}
    </>
  );
}
