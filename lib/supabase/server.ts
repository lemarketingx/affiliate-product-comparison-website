import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
export async function serverClient() {
  const c = supabaseConfig(); if (!c) return null;
  const jar = await cookies();
  return createServerClient(c.url,c.key,{ cookies: {
    getAll: () => jar.getAll(),
    setAll(values) { try { values.forEach(({name,value,options})=>jar.set(name,value,options)); } catch { /* Proxy refreshes cookies for Server Components. */ } },
  }});
}
export const getCurrentUser = cache(async () => {
  const client = await serverClient();
  if (!client) return null;
  const {data,error} = await client.auth.getUser();
  return error ? null : data.user;
});
