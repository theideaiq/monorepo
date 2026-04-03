import type { Database } from '@repo/database/types';
import { webEnv } from '@repo/env/web';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * This client is configured to:
 * 1. Read cookies from the request (to authenticate the user).
 * 2. Handle cookie setting (for refreshing sessions) when possible.
 *
 * @returns A Promise resolving to a typed Supabase client instance.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    webEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can happen if middleware is not configured correctly or if
            // a Server Component tries to modify cookies (which they cannot do directly).
            // We swallow the error here to allow read-only access to proceed.
          }
        },
      },
    },
  );
}
