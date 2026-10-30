import { safeReturnTo } from "@repo/auth/pass";
import { localePath } from "@repo/internationalization";
import { safeNextPath } from "@repo/internationalization/app-paths";

/**
 * Where to go after signing out: `return_to` when it is a path on this site
 * or a URL on one of The IDEA's hosts, else the Pass sign-in.
 */
export const afterSignOut = (returnTo: string | null, locale: string) =>
  safeNextPath(returnTo) ??
  safeReturnTo(returnTo, null) ??
  localePath(locale, "/sign-in");
