import type { Database } from '@repo/database/types';
import { adminEnv } from '@repo/env/admin';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient<Database>(
    adminEnv.NEXT_PUBLIC_SUPABASE_URL,
    adminEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
