import {referralInfo,ApiError} from "../../../lib/portal-server";
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
  if (!/^[a-z0-9]{6,32}$/.test(code)) return <Unavailable/>;
  try {
    const info=await referralInfo(code);
    if(!info)return <Unavailable/>;
    return <Capture code={code} partnerName={info.partnerName} settings={{...DEFAULT_SETTINGS,...info.settings}}/>;
  } catch(error) {if(error instanceof ApiError&&error.status===503)return <Unavailable/>;throw error;}

}
function Unavailable() {
  return <main className="public-page"><div className="empty" style={{ paddingTop: 150 }}><h1>הקישור אינו פעיל כרגע</h1><p>אפשר לפנות לאדם ששלח את הקישור כדי לקבל קישור מעודכן.</p><a className="btn btn-light" href="/">לעמוד הראשי</a></div></main>;
}
