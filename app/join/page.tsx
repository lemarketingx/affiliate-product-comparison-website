import Join from './join';
import { getCurrentUser } from '../../lib/supabase/server';
export const dynamic='force-dynamic';
export default async function JoinPage(){const u=await getCurrentUser();return <Join user={u?{name:'',email:u.email||''}:null}/>;}
