import type { PassPath } from "@repo/auth/pass";

/** The back office's home in `locale` (a path in The IDEA Spark). */
export const adminHome = (locale: string) => `/${locale}/admin`;

/**
 * A Pass page (sign-in, the authenticator app, sign-out) that comes back to
 * the back office afterwards.
 */
export const passLink = (path: Exclude<PassPath, "/">, locale: string) =>
  `/${locale}${path}?${new URLSearchParams({ return_to: adminHome(locale) })}`;
