import { createClient as createBrowserClient } from "@repo/auth/client";
import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<Database> | undefined;
let serverClient: SupabaseClient<Database> | undefined;

/**
 * Server rendering of client components renders their loading state only:
 * queries and auth listeners run in the browser. An inert client keeps it
 * independent of the request; it never makes a request. (Server Components
 * and Server Actions use `@repo/auth/server` with the session cookie.)
 */
const getServerRenderClient = () => {
  serverClient ??= createClient<Database>(
    "http://server-render.invalid",
    "server-render",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return serverClient;
};

/**
 * The browser's Supabase client: the cookie-based client from @repo/auth,
 * in web browsers and in the iOS/Android apps alike (their WebView loads
 * The IDEA Spark, so the same session cookie applies). Every query runs as
 * the signed-in user, so Row Level Security applies.
 */
export const getSupabase = () => {
  if (typeof window === "undefined") {
    return getServerRenderClient();
  }

  client ??= createBrowserClient();
  return client;
};
