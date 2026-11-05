import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
export function browserClient() {
  const c = supabaseConfig();
  if (!c) throw new Error('הכניסה עדיין לא הוגדרה.');
  return createBrowserClient(c.url,c.key);
}
