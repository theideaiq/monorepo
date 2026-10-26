/**
 * Helpers for the iOS/Android apps (Capacitor). Their WebView loads the
 * website itself, so the session is the same cookie as on the web; these only
 * add the app lifecycle and deep links.
 */
import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal shape of `App` from `@capacitor/app`, to avoid a hard dependency. */
export interface AppLifecycle {
  addListener: (
    event: "appStateChange",
    listener: (state: { isActive: boolean }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

/**
 * Refreshes tokens only while the app is in the foreground, as Supabase
 * recommends for mobile apps. Returns a function that removes the listener.
 */
export const bindAuthToAppLifecycle = async (
  supabase: SupabaseClient<Database>,
  app: AppLifecycle
) => {
  const handle = await app.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return () => handle.remove();
};

/**
 * Completes an OAuth or magic-link sign-in from a deep link such as
 * `com.example.app://auth/callback?code=…` (PKCE code exchange).
 */
export const handleAuthDeepLink = async (
  supabase: SupabaseClient<Database>,
  url: string
) => {
  const code = new URL(url).searchParams.get("code");

  if (!code) {
    return false;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return true;
};
