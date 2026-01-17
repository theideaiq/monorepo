import { createClient as createBaseClient } from '@repo/database/client';
import { webEnv } from '@repo/env/web';

export function createClient() {
  return createBaseClient(
    webEnv.NEXT_PUBLIC_SUPABASE_URL,
    webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
