/**
 * Links to The IDEA Pass (apps/pass), the only sign-in and sign-up UI on the
 * web, and the check of where it may send people back to afterwards.
 *
 * Reads the public URLs straight from `process.env.NEXT_PUBLIC_*` (inlined
 * at build time), so these helpers work in server and client code alike and
 * in every app, whichever env presets it extends.
 */

/** Where The IDEA Pass runs when NEXT_PUBLIC_PASS_URL is not set (local dev). */
export const DEFAULT_PASS_URL = "http://localhost:3006";

const TRAILING_SLASH = /\/+$/;
const LOCALHOST = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type PassPath = "/" | "/mfa" | "/sign-in" | "/sign-out" | "/sign-up";

export interface ReturnToOptions {
  /** Also accept localhost on any port (development). */
  allowLocalhost?: boolean;
  /** Hostnames people may be sent back to. */
  hosts?: Iterable<string>;
}

/** The Pass origin, without a trailing slash. */
export const passOrigin = () =>
  (process.env.NEXT_PUBLIC_PASS_URL || DEFAULT_PASS_URL).replace(
    TRAILING_SLASH,
    ""
  );

const hostOf = (value: string | undefined) => {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
};

/**
 * The hostnames of The IDEA's own sites: website, app, back office, design
 * site, API and the Pass itself.
 */
export const allowedReturnToHosts = () =>
  new Set(
    [
      process.env.NEXT_PUBLIC_WEB_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_ADMIN_URL,
      process.env.NEXT_PUBLIC_DESIGN_URL,
      process.env.NEXT_PUBLIC_API_URL,
      passOrigin(),
    ]
      .map(hostOf)
      .filter((host): host is string => Boolean(host))
  );

/**
 * Whether `url` is an absolute http(s) URL on one of The IDEA's hosts, so
 * the Pass may redirect there after signing in (never an open redirect).
 */
export const isAllowedReturnTo = (
  url: string | null | undefined,
  {
    allowLocalhost = process.env.NODE_ENV === "development",
    hosts = allowedReturnToHosts(),
  }: ReturnToOptions = {}
): url is string => {
  if (!url) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }
  if (allowLocalhost && LOCALHOST.has(parsed.hostname)) {
    return true;
  }
  return new Set(hosts).has(parsed.hostname);
};

/**
 * `url` when it is allowed, otherwise `fallback` (by default the app, which
 * is where most people are headed).
 */
export const safeReturnTo = (
  url: string | null | undefined,
  fallback: string | null = process.env.NEXT_PUBLIC_APP_URL ?? null,
  options?: ReturnToOptions
) => (isAllowedReturnTo(url, options) ? url : fallback);

/**
 * A link to a Pass page, e.g.
 * `passUrl("/sign-in", "https://app.theideaiq.com/en/cart", "en")` →
 * `https://pass.theideaiq.com/en/sign-in?return_to=https%3A%2F%2Fapp…`.
 * Without a locale, the Pass picks one from the browser.
 */
export const passUrl = (
  path: PassPath,
  returnTo?: string | null,
  locale?: string | null,
  origin: string = passOrigin()
) => {
  const prefix = locale ? `/${locale}` : "";
  const suffix = path === "/" ? "" : path;
  const url = new URL(
    `${origin.replace(TRAILING_SLASH, "")}${prefix}${suffix}`
  );
  if (returnTo) {
    url.searchParams.set("return_to", returnTo);
  }
  return url.toString();
};
