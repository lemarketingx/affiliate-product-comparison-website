import { NextResponse } from 'next/server';
import { serverClient } from '../../../lib/supabase/server';
import { safeNext } from '../../../lib/auth-paths';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');const c=await serverClient();if(code&&c){const {error}=await c.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')),url.origin));}return NextResponse.redirect(new URL('/sign-in?error=callback',url.origin));}
