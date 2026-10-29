import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { env } from './http.ts';

// The caller's own client: every query runs as them, under row-level security. Use this by default.
export const userClient = (req: Request) => createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
  global: { headers: { Authorization: req.headers.get('authorization') || '' } },
  auth: { persistSession: false, autoRefreshToken: false },
});

// Service-role client: bypasses row-level security. Only for server-only work (private schema,
// cron jobs), and every query must scope by org itself. Never return its rows unfiltered.
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

export function must<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}
