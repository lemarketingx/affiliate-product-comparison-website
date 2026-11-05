import {supabaseConfig} from '../../../lib/supabase/config';
import {serverClient} from '../../../lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(){if(!supabaseConfig())return Response.json({status:'pending',database:'not_configured'},{status:503});const c=await serverClient();const {error}=await c!.rpc('referral_info',{code:'health-check-nonexistent'});return Response.json({status:error?'unavailable':'ready',database:error?'unavailable':'connected'},{status:error?503:200,headers:{'Cache-Control':'no-store'}});}
