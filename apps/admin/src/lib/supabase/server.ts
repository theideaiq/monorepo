import { createServerClient } from '@supabase/ssr';
import { type CookieOptions, createServerClient as createServerClientCore } from '@supabase/ssr';
import { cookies } from 'next/headers';
import 'server-only';

import { adminEnv } from '@repo/env/admin';
import type { Database } from '@repo/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    adminEnv.NEXT_PUBLIC_SUPABASE_URL,
    adminEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    adminEnv.NEXT_PUBLIC_SUPABASE_URL,
    adminEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
