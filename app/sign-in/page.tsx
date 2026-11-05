import AuthForm from './auth-form';
import { supabaseConfig } from '../../lib/supabase/config';
import { safeNext } from '../../lib/auth-paths';
export const dynamic='force-dynamic';
export default async function SignIn({searchParams}:{searchParams:Promise<{next?:string;error?:string}>}) {const p=await searchParams;return <AuthForm ready={!!supabaseConfig()} next={safeNext(p.next||null)} callbackError={!!p.error}/>;}
