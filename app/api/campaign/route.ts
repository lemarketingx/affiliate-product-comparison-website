import {z} from 'zod';
import {requireClient,readPortal,readJson,sameOrigin,rpcError,apiFailure,ApiError} from '../../../lib/portal-server';
const https=z.string().max(1000).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}});
const schema=z.object({websiteUrl:https,headline:z.string().trim().min(2).max(120),description:z.string().trim().min(10).max(1200),benefits:z.string().max(500),logoUrl:z.union([z.literal(''),https]),published:z.boolean()});
export async function GET(){try{if((await readPortal()).user.role!=='admin')throw new ApiError(403,'למנהל בלבד.');const c=await requireClient();const {data,error}=await c.rpc('campaign_admin');if(error)rpcError(error);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{sameOrigin(request);const payload=schema.parse(await readJson(request,6000));const c=await requireClient();const {error}=await c.rpc('save_campaign',{payload});if(error)rpcError(error);return Response.json({ok:true});}catch(e){return apiFailure(e);}}
