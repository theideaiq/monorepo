import type { Database } from '@repo/database/types';
import { webEnv } from '@repo/env/web';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for the browser.
 *
 * Uses `@supabase/ssr` to handle session persistence via cookies automatically.
 * This client is safe to use in Client Components and useEffect hooks.
 *
 * @returns A typed Supabase client instance.
 */
export function createClient() {
  return createBrowserClient<Database>(
    webEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock',
  );
}
