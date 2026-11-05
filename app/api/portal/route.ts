import {readPortal,mutatePortal,apiFailure,sameOrigin,readJson,ApiError} from '../../../lib/portal-server';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await readPortal(),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{sameOrigin(request);const input=await readJson(request);if(typeof input.action!=='string'||!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))throw new ApiError(400,'בקשה לא תקינה.');await mutatePortal(input.action,input.payload as Record<string,unknown>);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
