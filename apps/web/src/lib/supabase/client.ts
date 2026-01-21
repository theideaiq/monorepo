import type { Database } from '@repo/database/types';
import { webEnv } from '@repo/env/web';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient<Database>(
    webEnv.NEXT_PUBLIC_SUPABASE_URL,
    webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
