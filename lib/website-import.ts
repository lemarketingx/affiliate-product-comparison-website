import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request} from 'node:https';
export async function publicUrl(input:string){const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||u.port)throw new Error('יש להזין כתובת HTTPS ציבורית.');const host=u.hostname.replace(/^\[|\]$/g,'');if(isIP(host)||!host.includes('.')||host.endsWith('.local')||host==='localhost')throw new Error('כתובת אינה מותרת.');const ips=await lookup(host,{all:true});if(!ips.length||ips.some(({address:a})=>!isIP(a)||a.includes(':')||/^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])|192\.0|198\.(18|19)|22[4-9]|23\d|24\d|25\d)\./.test(a)))throw new Error('כתובת אינה מותרת.');return u;}
const plain=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot);/g,' ').replace(/\s+/g,' ').trim();
async function pinnedFetch(u:URL){
 const addresses=await lookup(u.hostname,{all:true,family:4});
 if(!addresses.length||addresses.some(({address:a})=>/^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])|192\.0|198\.(18|19)|22[4-9]|23\d|24\d|25\d)\./.test(a)))throw Error('כתובת אינה מותרת');
 return new Promise<{status:number;location:string;html:string}>((resolve,reject)=>{
 const req=request(u,{method:'GET',headers:{Accept:'text/html'},lookup:(_host,_opts,cb)=>cb(null,addresses[0].address,4)},res=>{
 if(res.statusCode&&res.statusCode>=300&&res.statusCode<400){res.resume();resolve({status:res.statusCode,location:res.headers.location||'',html:''});return;}
 if(res.statusCode!==200||!res.headers['content-type']?.includes('text/html')){res.destroy();reject(Error('האתר אינו זמין'));return;}
 const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>500000){res.destroy();reject(Error('העמוד גדול מדי'));}else chunks.push(chunk);});res.on('end',()=>resolve({status:200,location:'',html:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);
 });req.setTimeout(8000,()=>req.destroy(Error('תם הזמן')));req.on('error',reject);req.end();
 });
}
export async function importWebsite(input:string){let u=await publicUrl(input);for(let i=0;i<4;i++){const r=await pinnedFetch(u);if(r.status>=300&&r.status<400){u=await publicUrl(new URL(r.location,u).href);continue;}let html=r.html;html=html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');const title=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,120);const paragraphs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>plain(x[1])).filter(x=>x.length>40);return {websiteUrl:u.href,headline:title,description:paragraphs.slice(0,3).join('\n').slice(0,1200),benefits:[...html.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].map(x=>plain(x[1])).filter(x=>x.length>5&&x.length<100).slice(0,3).join('\n')};}throw new Error('יותר מדי הפניות באתר.');}
