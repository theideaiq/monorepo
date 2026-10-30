import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

/** How long fetched catalog and editorial data is reused, in seconds. */
export const DATA_REVALIDATE = 300;

export type PublicClient = SupabaseClient<Database>;

/**
 * An anonymous Supabase client (publishable key, no cookies, no session), so
 * Row Level Security serves only public rows: active products, published
 * posts, events and journal issues. Its requests go through Next.js' data
 * cache and are refreshed every few minutes.
 *
 * Returns null when Supabase isn't configured, so the site still builds.
 */
export const createPublicClient = (): PublicClient | null => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!(url && key)) {
    return null;
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: DATA_REVALIDATE, tags: ["supabase"] },
        }),
    },
  });
};

/** The Supabase project URL, for public storage URLs (images, PDFs). */
export const supabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL ?? "";
