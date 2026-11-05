import {getCurrentUser} from '../../../lib/supabase/server';
import {readPortal,sameOrigin,readJson,apiFailure,ApiError} from '../../../lib/portal-server';
import {importWebsite} from '../../../lib/website-import';
export async function POST(request:Request){try{sameOrigin(request);if(!await getCurrentUser())throw new ApiError(401,'יש להתחבר.');if((await readPortal()).user.role!=='admin')throw new ApiError(403,'למנהל בלבד.');const {url}=await readJson(request,2000);if(typeof url!=='string')throw new ApiError(400,'כתובת חסרה.');try{return Response.json(await importWebsite(url));}catch{throw new ApiError(400,'לא ניתן לייבא מהכתובת הזאת. ודאו שזה אתר HTTPS ציבורי, או מלאו תוכן ידנית.');}}catch(e){return apiFailure(e);}}
