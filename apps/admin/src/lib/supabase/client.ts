import type { Database } from '@repo/database/types';
import { adminEnv as env } from '@repo/env/admin';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock',
  );
}
