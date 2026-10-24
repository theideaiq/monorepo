import { passUrl } from "@repo/auth/pass";
import { takeAccountDeletedNotice } from "./account-deletion";
import { safeNextPath } from "./navigation";
import { isNativeApp } from "./platform";

/**
 * On the web, sign-in and sign-up happen on The IDEA Pass, and the session
 * comes back in the shared cookie. The iOS/Android apps have no cookies:
 * they keep the in-app phone sign-in (same form, native client, session in
 * the Keychain/Keystore).
 */
export const usesPass = () => !isNativeApp();

/**
 * Leaves for The IDEA Pass sign-in or sign-up; it returns to `next` (a path
 * inside this app, with its locale) or the app's home afterwards.
 */
export const goToPass = (
  path: "/sign-in" | "/sign-up",
  locale: string,
  next?: string | null
) => {
  const safe = safeNextPath(next);
  const returnTo = `${window.location.origin}/${locale}${safe ?? ""}`;
  const url = new URL(passUrl(path, returnTo, locale));
  if (path === "/sign-in" && takeAccountDeletedNotice()) {
    url.searchParams.set("notice", "deleted");
  }
  window.location.replace(url.toString());
};
