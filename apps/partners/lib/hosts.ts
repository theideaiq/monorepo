/**
 * One app, two hosts: The IDEA Partners (partners.theideaiq.com) and Staff
 * (staff.theideaiq.com). Staff pages live under `app/[locale]/staff` but
 * answer only on the staff host, at its root (`/orders` there is
 * `/staff/orders` inside the app); partner pages answer only on the
 * partners host. `proxy.ts` applies these rules.
 */

const LOCALE_PREFIX = /^\/(?:ar|en)(?=\/|$)/;
const STAFF_PREFIX = /^\/(?:(?:ar|en)\/)?staff(?:\/|$)/;
const DESIGN_PREFIX = /^\/design(?:\/|$)/;

const hostOf = (url: string | undefined) => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/**
 * Whether `host` (hostname and port, as the browser sent it) is the staff
 * host: NEXT_PUBLIC_STAFF_URL's (localhost:3003 in development, a port
 * forwarded to this app so the Pass's localhost cookie still applies), or
 * any `staff.` host.
 */
export const isStaffHost = (
  host: string,
  staffUrl = process.env.NEXT_PUBLIC_STAFF_URL
) => host === hostOf(staffUrl) || host.startsWith("staff.");

/** Whether a path is inside the app's staff tree (`/staff…`, `/ar/staff…`). */
export const isStaffPath = (pathname: string) => STAFF_PREFIX.test(pathname);

/** Whether a path is the design site (`/design…`, on the staff host only). */
export const isDesignPath = (pathname: string) => DESIGN_PREFIX.test(pathname);

/**
 * A path on the staff host as the app's path: `/ar/orders` →
 * `/ar/staff/orders`, `/en` → `/en/staff`.
 */
export const toStaffPath = (pathname: string) => {
  const locale = LOCALE_PREFIX.exec(pathname)?.[0] ?? "";
  const rest = pathname.slice(locale.length);
  return `${locale}/staff${rest === "/" ? "" : rest}`;
};

/** The locale prefix of a path (`/ar`), or English's `/en`. */
export const localeSegment = (pathname: string) =>
  LOCALE_PREFIX.exec(pathname)?.[0] ?? "/en";
