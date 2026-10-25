/**
 * Paths inside The IDEA's sites: a safe post-sign-in destination, and the
 * current page for links stored in older shapes (notifications sent on the
 * website, in push and on Telegram).
 */

/**
 * A post-sign-in destination taken from the URL. Only paths inside this app
 * are accepted, never absolute or protocol-relative URLs (open redirects).
 */
export const safeNextPath = (value: string | null | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : null;

const LEGACY_DETAIL_PAGES: Record<string, [string, string]> = {
  "/orders/view": ["/pass/orders", "id"],
  "/store/product": ["/store", "slug"],
  "/support/view": ["/pass/support", "id"],
};

/** Sections of The IDEA Pass that links stored before it moved still name
 * without their `/pass` prefix (notifications, emails, Telegram). */
const PASS_SECTIONS = ["/orders", "/plus", "/sell", "/settings", "/support"];

const inPass = (pathname: string) =>
  PASS_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`)
  )
    ? `/pass${pathname}`
    : pathname;

/**
 * Detail pages took a query parameter while the app was a static export
 * (`/orders/view?id=…`) and The IDEA Pass sections had no `/pass` prefix;
 * links stored with those shapes (notifications) open the page's current
 * URL (`/pass/orders/…`). Other paths are returned unchanged.
 */
export const currentAppPath = (path: string) => {
  const url = new URL(path, "http://site.invalid");
  const legacy = LEGACY_DETAIL_PAGES[url.pathname];
  const value = legacy ? url.searchParams.get(legacy[1]) : null;
  if (!(legacy && value)) {
    const moved = inPass(url.pathname);
    return moved === url.pathname ? path : `${moved}${url.search}${url.hash}`;
  }
  url.searchParams.delete(legacy[1]);
  const query = url.searchParams.toString();
  return `${legacy[0]}/${encodeURIComponent(value)}${query ? `?${query}` : ""}`;
};
