import type { Database } from '@repo/database/types';
import { droidEnv as env } from '@repo/env/droid';
import { createClient } from '@supabase/supabase-js';

// We use the service role key to bypass RLS for the bot's operations.
// The bot acts as an admin/system user to search products and read data
// that might be restricted or to perform actions on behalf of the system.
export const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
