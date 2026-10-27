import { type PassPath, passUrl } from "@repo/auth/pass";
import { localePath } from "@repo/internationalization";

const TRAILING_SLASH = /\/+$/;

/** Staff's own host (NEXT_PUBLIC_STAFF_URL; localhost:3003 in development). */
export const staffUrl = () =>
  (process.env.NEXT_PUBLIC_STAFF_URL || "http://localhost:3003").replace(
    TRAILING_SLASH,
    ""
  );

/**
 * A Pass page on the website (sign-in, the authenticator app, sign-out)
 * that comes back to Staff's home afterwards.
 */
export const passLink = (path: Exclude<PassPath, "/">, locale: string) =>
  passUrl(path, `${staffUrl()}${localePath(locale, "/")}`, locale);
