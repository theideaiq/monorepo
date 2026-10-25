import { type PassPath, passUrl } from "@repo/auth/pass";
import { localePath } from "@repo/internationalization";

const TRAILING_SLASH = /\/+$/;

/** The back office's home in `locale` (a path in The IDEA Spark). */
export const adminHome = (locale: string) => localePath(locale, "/admin");

/**
 * A Pass page on the website (sign-in, the authenticator app, sign-out)
 * that comes back to the back office afterwards.
 */
export const passLink = (path: Exclude<PassPath, "/">, locale: string) =>
  passUrl(
    path,
    `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(TRAILING_SLASH, "")}${adminHome(locale)}`,
    locale
  );
