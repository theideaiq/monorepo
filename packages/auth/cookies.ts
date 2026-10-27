import type { CookieOptionsWithName } from "@supabase/ssr";
import { keys } from "./keys";

/**
 * Session cookie settings shared by every host of The IDEA. With
 * NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=".theideaiq.com" the Supabase session cookie
 * (`sb-<project ref>-auth-token`, chunked as `.0`, `.1`, … when long) is
 * written for the whole domain, so a sign-in on The IDEA Pass carries over
 * to the website, the app and Staff. Unset (local development,
 * previews), the cookie is host-only; on localhost cookies are shared across
 * ports anyway.
 *
 * Used by the browser client, the server client and the proxy's session
 * refresh: all three must write the cookie with the same scope, or a refresh
 * on one host would leave a stale copy on another.
 */
export const authCookieOptions = (): CookieOptionsWithName => {
  const domain = keys().NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

  return {
    ...(domain ? { domain } : {}),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
};
