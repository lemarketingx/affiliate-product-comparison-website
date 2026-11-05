import project from '../../supabase/project.json';
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || project.url;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || project.publishableKey;
  if (!url || !key) return null;
  if (!url.startsWith('https://') || !key.startsWith('sb_publishable_')) throw new Error('Expected a public Supabase publishable key and HTTPS URL');
  return { url, key };
}
