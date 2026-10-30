import type { Database } from "@repo/database";
import type { Provider, SupabaseClient } from "@supabase/supabase-js";

/**
 * Signing in to The IDEA Pass with Google, Apple or Telegram (Supabase
 * Auth's OAuth providers, PKCE; Telegram is the custom OIDC provider
 * `custom:telegram`). An address that already has a Pass is linked to it
 * when the provider says the address is verified. Telegram has no email:
 * it signs in to a Pass it was connected to, and a Pass starts with an
 * email (the database refuses a Telegram-only one). Each provider shows
 * only once it's set up in Supabase and named in NEXT_PUBLIC_AUTH_PROVIDERS.
 */

export const SOCIAL_PROVIDERS = ["google", "apple", "telegram"] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** Supabase Auth's name for each provider. */
export const SUPABASE_PROVIDER: Record<SocialProvider, Provider> = {
  apple: "apple",
  google: "google",
  telegram: "custom:telegram",
};

/**
 * What each provider is asked for: the email and the name, no more; from
 * Telegram the profile and leave for the bot to message the person.
 */
const SCOPES: Record<SocialProvider, string | undefined> = {
  apple: "name email",
  google: undefined,
  telegram: "openid profile telegram:bot_access",
};

/** The providers turned on (a comma-separated list, in the order given). */
export const enabledProviders = (list: string | undefined): SocialProvider[] =>
  (list ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SocialProvider =>
      (SOCIAL_PROVIDERS as readonly string[]).includes(item)
    );

const RETURN_KEY = "theidea.pass.returnTo";
const PROVIDER_KEY = "theidea.pass.provider";

/** The provider sign-in last left for (read once by the callback), or null. */
export const takeProvider = (): SocialProvider | null => {
  try {
    const value = sessionStorage.getItem(PROVIDER_KEY);
    sessionStorage.removeItem(PROVIDER_KEY);
    return (SOCIAL_PROVIDERS as readonly string[]).includes(value ?? "")
      ? (value as SocialProvider)
      : null;
  } catch {
    return null;
  }
};

const rememberProvider = (provider: SocialProvider) => {
  try {
    sessionStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    // Storage blocked: the callback shows the general message.
  }
};

/** Remembers where to go after the provider sends the person back. */
export const rememberReturnTo = (returnTo: string | null) => {
  try {
    if (returnTo) {
      sessionStorage.setItem(RETURN_KEY, returnTo);
    } else {
      sessionStorage.removeItem(RETURN_KEY);
    }
  } catch {
    // Storage blocked: the callback goes to Your Pass.
  }
};

/** Where to go after the callback (read once), or null. */
export const takeReturnTo = () => {
  try {
    const value = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return value;
  } catch {
    return null;
  }
};

interface SocialOptions {
  /** Link to the signed-in Pass instead of signing in (Settings). */
  link?: boolean;
  /** Opens a URL in the system browser (the iOS/Android apps). */
  openExternal?: (url: string) => Promise<void>;
  /** Where the provider sends the person back (the callback page or the app's deep link). */
  redirectTo: string;
}

/**
 * Starts signing in (or linking) with a provider. On the web the browser
 * leaves for the provider; in the apps the provider opens in the system
 * browser (Google refuses embedded web views) and comes back through the
 * app's deep link, which the native bridge completes.
 */
export const startSocialSignIn = async (
  supabase: SupabaseClient<Database>,
  provider: SocialProvider,
  { link = false, openExternal, redirectTo }: SocialOptions
) => {
  const options = {
    redirectTo,
    scopes: SCOPES[provider],
    skipBrowserRedirect: Boolean(openExternal),
  };
  rememberProvider(provider);
  const { data, error } = link
    ? await supabase.auth.linkIdentity({
        options,
        provider: SUPABASE_PROVIDER[provider],
      })
    : await supabase.auth.signInWithOAuth({
        options,
        provider: SUPABASE_PROVIDER[provider],
      });
  if (error) {
    return { error: error.message, ok: false as const };
  }
  if (openExternal && data.url) {
    await openExternal(data.url);
  }
  return { ok: true as const };
};
