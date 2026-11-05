import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { partners, settings } from "../../../db/schema";
import { demoData } from "../../../lib/demo";
import { DEFAULT_SETTINGS } from "../../../lib/domain";
import Capture from "./capture";
export const dynamic = "force-dynamic";
export default async function ReferralPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ demo?: string; name?: string }> }) {
  const { code } = await params, query = await searchParams;
  if (query.demo === "1") {
    const partner = demoData().partners.find(p => p.code === code);
    return <Capture code={code} partnerName={partner?.name ?? query.name?.slice(0, 80) ?? "שותף לדוגמה"} settings={DEFAULT_SETTINGS} demo/>;
  }
  if (!/^[a-z0-9]{6,16}$/.test(code)) return <Unavailable/>;
  const db = getDb();
  const partner = await db.select().from(partners).where(eq(partners.code, code)).get();
  if (!partner || partner.status !== "active") return <Unavailable/>;
  const config = await db.select().from(settings).where(eq(settings.id, 1)).get();
  return <Capture code={code} partnerName={partner.name} settings={{ businessName: config?.businessName ?? "קשר", advisorName: config?.advisorName ?? DEFAULT_SETTINGS.advisorName, contactEmail: config?.contactEmail ?? "", contactPhone: config?.contactPhone ?? "", commissionMode: "unset", commissionValue: null }}/>;
}
function Unavailable() {
  return <main className="public-page"><div className="empty" style={{ paddingTop: 150 }}><h1>הקישור אינו פעיל כרגע</h1><p>אפשר לפנות לאדם ששלח את הקישור כדי לקבל קישור מעודכן.</p><a className="btn btn-light" href="/">לעמוד הראשי</a></div></main>;
}
