import type { Database } from "@repo/database";
import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "./cookies";
import { keys } from "./keys";

/**
 * Browser client for the web build. Sessions live in cookies so server
 * components and the proxy can read them, on the shared parent domain when
 * NEXT_PUBLIC_AUTH_COOKIE_DOMAIN is set (one sign-in on The IDEA Pass for
 * every site). (`createBrowserClient` reuses one
 * instance per page.) The Capacitor apps use it too: their WebView loads
 * the website, so the cookie works there as well.
 */
export const createClient = () => {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    keys();

  if (!(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error(
      "Supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookieOptions: authCookieOptions() }
  );
};

export type BrowserClient = ReturnType<typeof createClient>;
