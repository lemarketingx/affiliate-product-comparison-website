import { requireAdmin } from "../../../../lib/dealpilot/auth";
import { getBannerSnapshot, redirectChecks, type BannerStatus } from "../../../../lib/aliexpress/banners";
import { ATTRIBUTION, PORTAL_BANNERS } from "../../../../lib/aliexpress/banner-config";
import VerifyButton from "./verify-button";

export const dynamic = "force-dynamic";
const STATUS: Record<BannerStatus, string> = {
  published: "מפורסם (קישור תקין)",
  blocked: "חסום",
  expired: "הסתיים · הוסר",
  upcoming: "טרם התחיל",
  fallback: "חלופה",
};
const SOURCE = { portals: "AliExpress Portals (ייבוא ידני)", featuredpromo: "Affiliate API · featuredpromo", category: "קטגוריה" } as const;
const d = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(iso)) : "לא דווח";

export default async function BannersPage() {
  await requireAdmin();
  const snap = await getBannerSnapshot();
  const published = snap.banners.filter((b) => b.status === "published");
  const checks = published.map((b) => redirectChecks.get(b.id)).filter(Boolean);
  const okChecks = checks.filter((c) => c!.ok).length;
  return (
    <>
      <header className="dp-page-title">
        <div>
          <span className="dp-kicker">BANNERS & CAMPAIGNS</span>
          <h1>באנרים וקמפיינים</h1>
          <p className="dp-muted">
            מקורות: באנרים רשמיים שיובאו ידנית מ־AliExpress Portals, וקמפיינים מ־<code>aliexpress.affiliate.featuredpromo.get</code>. לכל באנר
            נוצר קישור ב־<code>aliexpress.affiliate.link.generate</code>. באנר בלי קישור תקין ומזהה מעקב תואם לא מתפרסם.
          </p>
        </div>
      </header>
      <section className="dp-panel">
        <h2>מצב החיבור</h2>
        <ul>
          <li>Affiliate API: {snap.apiConfigured ? "מוגדר" : "לא מוגדר"}</li>
          <li>ALIEXPRESS_TRACKING_ID: {snap.trackingConfigured ? "מוגדר (" + snap.trackingIdMasked + ")" : "לא מוגדר. אף באנר לא יתפרסם"}</li>
          <li>קמפיינים שהוחזרו מ־featuredpromo.get: {snap.promosFound}{snap.promoFieldsSeen.length ? " · שדות שהתקבלו: " + snap.promoFieldsSeen.join(", ") : ""}</li>
          <li>באנרים מ־Portals בקובץ התצורה: {PORTAL_BANNERS.length}</li>
          <li>נבדק: {d(snap.checkedAt)} (מתרענן כל שעה)</li>
          {Object.entries(snap.errors).map(([code, n]) => (
            <li key={code}>שגיאת ספק <code dir="ltr">{code}</code> × {n}</li>
          ))}
        </ul>
      </section>
      <section className="dp-panel">
        <h2>אימות קישורים וייחוס</h2>
        <p>
          הפניות תקינות: {okChecks} מתוך {checks.length} שנבדקו ({published.length} באנרים מפורסמים). היעד: לפחות 3 הפניות תקינות.
        </p>
        <p>
          ייחוס עמלות: {ATTRIBUTION.confirmed ? `אומת ב־${ATTRIBUTION.checkedAt} (${ATTRIBUTION.how})` : "טרם אומת"}. אימות הייחוס
          נעשה רק בדוחות AliExpress Portals: קליקים או הזמנות שמופיעים תחת מזהה המעקב. הפניה תקינה אינה הוכחה לייחוס.
        </p>
        <VerifyButton disabled={!published.length} />
      </section>
      <section className="dp-panel">
        <h2>כל הבאנרים</h2>
        {snap.banners.length === 0 ? (
          <p className="dp-muted">לא נמצאו באנרים או קמפיינים. בדף הבית מוצגים שערי קטגוריות במקומם.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dp-table">
              <thead>
                <tr><th>כותרת</th><th>מקור</th><th>סטטוס</th><th>תקופה</th><th>קישור</th><th>הפניה</th></tr>
              </thead>
              <tbody>
                {snap.banners.map((b) => {
                  const c = redirectChecks.get(b.id);
                  return (
                    <tr key={b.id}>
                      <td dir="auto">{b.title}{b.productCount !== null ? ` (${b.productCount} מוצרים)` : ""}</td>
                      <td>{SOURCE[b.source]}</td>
                      <td>{STATUS[b.status]}{b.reason ? " · " + b.reason : ""}</td>
                      <td>{d(b.startsAt)} – {d(b.endsAt)}</td>
                      <td dir="ltr" style={{ wordBreak: "break-all" }}>{b.link ?? "—"}</td>
                      <td>{c ? (c.ok ? "תקין" : "לא תקין") + " · " + c.note + " · " + c.hops.map((h) => h.status + " " + h.host).join(" → ") : "לא נבדק"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
