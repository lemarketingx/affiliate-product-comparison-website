// Per-process flood guard only. Deployment-wide enforcement belongs in the Vercel WAF.
const windows = new Map<string, { count: number; until: number }>();
export function allowRequest(
  key: string,
  limit: number,
  period = 60000,
  now = Date.now(),
) {
  for (const [id, entry] of windows) if (entry.until <= now) windows.delete(id);
  const entry = windows.get(key);
  if (entry && entry.until > now) {
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
  if (windows.size >= 1000) return false;
  windows.set(key, { count: 1, until: now + period });
  return true;
}
