import { getCatalog } from "../../../lib/aliexpress/catalog";
import { recordClick, safeSource } from "../../../lib/dealpilot/tracking";
import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request, context:{params:Promise<{id:string}>}) {
  const {id}=await context.params;
  if (!/^\d{4,24}$/.test(id)) return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
  const catalog=await getCatalog();
  const product=catalog.items.find(item=>item.id===id);
  // Only link returned by the affiliate API is eligible. Never accept destination URLs from the visitor.
  if (!product?.affiliateUrl) return new Response("Affiliate link unavailable",{status:404,headers:{"Cache-Control":"no-store"}});
  let url:URL;
  try {
    url=new URL(product.affiliateUrl);
    const host=url.hostname.toLowerCase();
    if (url.protocol!=="https:" || !["aliexpress.com","aliexpress.us","s.click.aliexpress.com"].some(domain=>host===domain || host.endsWith("."+domain))) throw Error("host");
  } catch {
    return new Response("Invalid destination",{status:502,headers:{"Cache-Control":"no-store"}});
  }
  const source=safeSource(new URL(request.url).searchParams.get("source"));
  // Tracking failures must never turn into fictitious click data or change the destination.
  await recordClick({id:product.id,title:product.title,category:product.category,affiliateUrl:product.affiliateUrl},source);
  const response=NextResponse.redirect(url,307);
  response.headers.set("Cache-Control","no-store, max-age=0");
  response.headers.set("Referrer-Policy","no-referrer");
  response.headers.set("X-Robots-Tag","noindex, nofollow");
  return response;
}
