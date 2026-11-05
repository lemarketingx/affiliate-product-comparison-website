import { NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase/server';
import { sameOrigin,apiFailure } from '../../../lib/portal-server';
export async function POST(request:Request){try{sameOrigin(request);const c=await serverClient();await c?.auth.signOut();return NextResponse.redirect(new URL('/',request.url),303);}catch(e){return apiFailure(e);}}
