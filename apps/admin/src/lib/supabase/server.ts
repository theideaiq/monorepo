
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { adminEnv } from '@repo/env/admin';

// Separate function to get cookies dynamically to avoid "next/headers" import at module level
const getCookies = async () => {
    const { cookies } = await import('next/headers');
    return cookies();
};

export async function createClient() {
  const cookieStore = await getCookies();

  return createServerClient(
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
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
