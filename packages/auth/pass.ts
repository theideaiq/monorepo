/**
 * Links to The IDEA Pass (the sign-in, authenticator and "My
 * Pass" pages of the website, apps/web), the only sign-in UI on the web,
 * and the check of where it may send people back to afterwards.
 *
 * Reads the public URLs straight from `process.env.NEXT_PUBLIC_*` (inlined
 * at build time), so these helpers work in server and client code alike and
 * in every app, whichever env presets it extends.
 */

import { localePath } from "@repo/internationalization";

/** Where the website runs when NEXT_PUBLIC_WEB_URL is not set (local dev). */
export const DEFAULT_PASS_URL = "http://localhost:3001";

const TRAILING_SLASH = /\/+$/;
const LOCALHOST = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type PassPath = "/" | "/mfa" | "/sign-in" | "/sign-out";

export interface ReturnToOptions {
  /** Also accept localhost on any port (development). */
  allowLocalhost?: boolean;
  /** Hostnames people may be sent back to. */
  hosts?: Iterable<string>;
}

/** The Pass origin (the website), without a trailing slash. */
export const passOrigin = () =>
  (process.env.NEXT_PUBLIC_WEB_URL || DEFAULT_PASS_URL).replace(
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
 * The hostnames of The IDEA's own sites: the website (with the Pass), The
 * IDEA Business (company pages and the back office), the design site and the API.
 */
export const allowedReturnToHosts = () =>
  new Set(
    [
      process.env.NEXT_PUBLIC_WEB_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_DESIGN_URL,
      process.env.NEXT_PUBLIC_API_URL,
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
 * `url` when it is allowed, otherwise `fallback` (by default the website,
 * which is where most people are headed).
 */
export const safeReturnTo = (
  url: string | null | undefined,
  fallback: string | null = process.env.NEXT_PUBLIC_WEB_URL ?? null,
  options?: ReturnToOptions
) => (isAllowedReturnTo(url, options) ? url : fallback);

/**
 * A link to a Pass page, e.g.
 * `passUrl("/sign-in", "https://theideaiq.com/ar/store", "ar")` →
 * `https://theideaiq.com/ar/sign-in?return_to=https%3A%2F%2Ftheideaiq…`
 * (English pages have no prefix: `/sign-in`). `"/"` is Your Pass (`/pass`).
 * Without a locale, the website picks one from the browser.
 */
export const passUrl = (
  path: PassPath,
  returnTo?: string | null,
  locale?: string | null,
  origin: string = passOrigin()
) => {
  const suffix = path === "/" ? "/pass" : path;
  const url = new URL(
    `${origin.replace(TRAILING_SLASH, "")}${locale ? localePath(locale, suffix) : suffix}`
  );
  if (returnTo) {
    url.searchParams.set("return_to", returnTo);
  }
  return url.toString();
};
