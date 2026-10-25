import { safeReturnTo } from "@repo/auth/pass";
import { safeNextPath } from "@/lib/app-navigation";

/**
 * Where to go after signing out: `return_to` when it is a path on this site
 * or a URL on one of The IDEA's hosts, else the Pass sign-in.
 */
export const afterSignOut = (returnTo: string | null, locale: string) =>
  safeNextPath(returnTo) ??
  safeReturnTo(returnTo, null) ??
  `/${locale}/sign-in`;
