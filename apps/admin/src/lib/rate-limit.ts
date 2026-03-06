import { createClient } from '@/lib/supabase/server';

export const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
export const MAX_REQUESTS = 5; // 5 requests per minute

/**
 * Checks if a specific key has exceeded the rate limit.
 * Implements a sliding window strategy using a Supabase table.
 *
 * Note: This implementation is distributed (works across Vercel Lambdas) because
 * state is stored in the database.
 *
 * @param key - The unique key to rate limit (e.g., user ID or IP).
 * @returns A promise resolving to `true` if allowed, `false` if blocked.
 *
 * @example
 * const isAllowed = await checkRateLimit(user.id);
 * if (!isAllowed) {
 *   throw new Error("Too many requests");
 * }
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  const supabase = await createClient();

  // 1. Get current limit
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  const now = new Date();

  if (error || !data) {
    // Insert new
    // We use upsert to handle race conditions if multiple requests come in at once
    await supabase.from('rate_limits').upsert({
      key,
      count: 1,
      last_request: now.toISOString(),
    });
    return true;
  }

  const lastRequest = new Date(data.last_request);
  const timeDiff = now.getTime() - lastRequest.getTime();

  if (timeDiff > WINDOW_SIZE_MS) {
    // Reset window
    await supabase
      .from('rate_limits')
      .update({
        count: 1,
        last_request: now.toISOString(),
      })
      .eq('key', key);
    return true;
  }

  if (data.count >= MAX_REQUESTS) {
    return false;
  }

  // Increment count
  await supabase
    .from('rate_limits')
    .update({
      count: data.count + 1,
      last_request: now.toISOString(),
    })
    .eq('key', key);

  return true;
}
