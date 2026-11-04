import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

/** How long fetched catalog and editorial data is reused, in seconds. */
export const DATA_REVALIDATE = 300;

/**
 * How long a request to Supabase may take before it's given up, in ms. Without
 * a limit a stalled connection held the page until the platform's 300-second
 * timeout; with one, list queries fall back to empty results (`lib/data.ts`)
 * and the page still renders.
 */
export const DATA_TIMEOUT_MS = 10_000;

/** The caller's abort signal, if any, combined with the request time limit. */
export const withTimeout = (signal: AbortSignal | null | undefined) => {
  const limit = AbortSignal.timeout(DATA_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, limit]) : limit;
};

export type PublicClient = SupabaseClient<Database>;

/**
 * An anonymous Supabase client (publishable key, no cookies, no session), so
 * Row Level Security serves only public rows: active products, published
 * posts, events and journal issues. Its requests go through Next.js' data
 * cache, are refreshed every few minutes and give up after
 * `DATA_TIMEOUT_MS`.
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
          signal: withTimeout(init?.signal),
        }),
    },
  });
};

/** The Supabase project URL, for public storage URLs (images, PDFs). */
export const supabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL ?? "";
