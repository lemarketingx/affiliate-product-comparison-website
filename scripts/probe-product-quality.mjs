// Explicit, one-off server/build diagnostic. Never imported by the storefront.
// Maximum seven requests, no retries, no secret or buyer data in output.
import { createHmac } from "node:crypto";
if (process.env.VERCEL_ENV !== "preview") throw new Error("Preview-only diagnostic");
const key=process.env.ALIEXPRESS_APP_KEY?.trim(), secret=process.env.ALIEXPRESS_APP_SECRET?.trim();
if(!key||!secret){console.log('[quality-probe] '+JSON.stringify({code:'CREDENTIALS_MISSING'}));process.exit(0);}
let remaining=7;
function log(value){console.log('[quality-probe] '+JSON.stringify(value));}
function chinaTime(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;}
async function call(label,method,input){
 if(--remaining<0)throw new Error('Probe budget exceeded');
 const params={app_key:key,method,sign_method:'hmac',format:'json',v:'2.0',timestamp:chinaTime(),...input};
 params.sign=createHmac('md5',secret).update(Object.keys(params).sort().map(k=>k+params[k]).join('')).digest('hex').toUpperCase();
 try { const response=await fetch('https://api-sg.aliexpress.com/sync',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(params),signal:AbortSignal.timeout(12000)});
  if(!response.ok){log({label,http:response.status});return null;}
  const data=await response.json();
  if(data.error_response){log({label,errorCode:String(data.error_response.code??'UNKNOWN').replace(/[^\w-]/g,'').slice(0,40),subCode:String(data.error_response.sub_code??'').replace(/[^\w.-]/g,'').slice(0,60)});return null;}
  const root=data[method.replaceAll('.','_')+'_response'];
  if(method==='aliexpress.social.product.evaluation.query'){
   const result=root?.result;const body=result?.result;const rows=body?.evaluations?.buyer_evaluation;const reviews=Array.isArray(rows)?rows:rows?[rows]:[];
   log({label,success:result?.success===true,total:body?.total_number??null,count:reviews.length,israelCount:reviews.filter(r=>r.buyer_country_code==='IL').length,ratings:reviews.map(r=>r.evaluation).filter(v=>/^\d(?:\.\d+)?$/.test(String(v))).slice(0,20)});return null;
  }
  const dto=root?.resp_result;const rows=dto?.result?.products?.product;const products=Array.isArray(rows)?rows:rows?[rows]:[];
  log({label,resultCode:dto?.resp_code??null,count:products.length,fields:products[0]?Object.keys(products[0]):[],products:products.slice(0,3).map(p=>({id:String(p.product_id),title:p.product_title,orders:p.lastest_volume,positiveRate:p.evaluate_rate,shipping:p.ship_to_days??null,hasHebrew:/[\u0590-\u05ff]/.test(p.product_title??'')}))});
  return String(dto?.resp_code)==='200'?products:null;
 } catch {log({label,errorCode:'PROVIDER_UNREACHABLE_OR_INVALID_JSON'});return null;}
}
const method='aliexpress.affiliate.product.query';const base={keywords:'phone accessories',page_no:'1',page_size:'10'};
const baseline=await call('baseline',method,base);
const sorted=await call('sort-only',method,{...base,sort:'LAST_VOLUME_DESC'});
const country=await call('israel-only',method,{...base,ship_to_country:'IL'});
const translated=await call('hebrew-only',method,{...base,target_language:'HE'});
if(sorted&&country&&translated)await call('combined',method,{...base,sort:'LAST_VOLUME_DESC',ship_to_country:'IL',target_language:'HE'});
const candidate=(sorted??baseline??[]).find(p=>Number(p.lastest_volume)>500)??(baseline??[])[0];
if(candidate){const product_id=String(candidate.product_id);await call('israel-reviews','aliexpress.social.product.evaluation.query',{product_id,country_code:'IL',page:'1',page_size:'20'});await call('global-reviews','aliexpress.social.product.evaluation.query',{product_id,page:'1',page_size:'20'});}
