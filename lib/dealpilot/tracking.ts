import "server-only";
import { createClient } from "@supabase/supabase-js";

// Use a SEPARATE Supabase project for DealPilot. Never write to the legacy mortgage database.
// The service role key is server-only and must never have NEXT_PUBLIC_ prefix.
function db() {
  const url = process.env.DEALPILOT_SUPABASE_URL?.trim();
  const key = process.env.DEALPILOT_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co")) return null;
  } catch { return null; }
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function trackingConfigured() { return db() !== null; }

export type ClickSource = "catalog" | "telegram" | "facebook" | "instagram" | "other";
export function safeSource(value: string | null): ClickSource {
  switch(value) {
    case "catalog":case "telegram":case "facebook":case "instagram":return value;
    default:return "other";
  }
}

export async function recordClick(product: {
  id:string; title:string; category:string; affiliateUrl:string;
}, source:ClickSource):Promise<boolean> {
  const client=db();
  if (!client) return false;
  try {
    // The unique product id is resolved server-side against the live supplier catalog.
    // Store no visitor IP, cookie, user agent, browser fingerprint or raw referrer.
    const {error}=await client.from("dealpilot_click_events").insert({
      product_id:product.id.slice(0,100),
      product_title:product.title.slice(0,250),
      category:product.category.slice(0,70),
      source,
    });
    return !error;
  } catch {return false;}
}

export async function clickSummary() {
  const client=db();
  if (!client) return {ready:false,total:0,bySource:[] as {source:string;clicks:number}[]};
  const {data,error}=await client.from("dealpilot_click_totals").select("source,clicks");
  if (error) return {ready:false,total:0,bySource:[] as {source:string;clicks:number}[]};
  const bySource=(data??[]).map(row=>({source:String(row.source),clicks:Number(row.clicks)}));
  return {ready:true,total:bySource.reduce((sum,row)=>sum+row.clicks,0),bySource};
}
