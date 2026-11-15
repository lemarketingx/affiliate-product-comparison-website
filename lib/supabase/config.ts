// Legacy mortgage clients are intentionally disconnected on the DealPilot branch.
// Keep a compatible type for preserved legacy source, but never resolve its project/env.
export function supabaseConfig(): {url:string;key:string} | null { return null; }
