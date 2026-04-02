import 'server-only';

import type { Database } from '@repo/database/types';
import { adminEnv } from '@repo/env/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    },
  );
}
