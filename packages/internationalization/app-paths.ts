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
  "/support/view": ["/help", "id"],
};

/**
 * Pages that moved, as [old path, current path, anchor on the current
 * page]. An old path also covers the pages under it (`/pass/support/7` →
 * `/help/7`); the anchor is only added for the page itself.
 */
const MOVED: readonly (readonly [string, string, string?])[] = [
  ["/orders", "/pass/orders"],
  ["/settings", "/pass/settings"],
  ["/sell", "/pass/orders", "#sell"],
  ["/pass/sell", "/pass/orders", "#sell"],
  ["/support", "/help"],
  ["/pass/support", "/help"],
  ["/pass/plus", "/plus", "#yours"],
  ["/pass/affiliate", "/pass/bulbs", "#invite"],
  ["/pass/wishlist", "/saved"],
  ["/pass/events", "/club", "#yours"],
  ["/pass/submissions", "/club", "#yours"],
  ["/post/events", "/club"],
  ["/post", "/club"],
  ["/suite", "/business"],
  ["/about/careers", "/careers"],
  ["/about/faq", "/help"],
  ["/about/contact", "/help", "#contact"],
  ["/i", "/r"],
  ["/a", "/r"],
];

/** Sections of /post that were pages and are now filters of /club. */
const POST_SECTIONS = new Set(["/post/news", "/post/stories", "/post/learn"]);

const moved = (pathname: string): [string, string] | null => {
  if (POST_SECTIONS.has(pathname)) {
    return ["/club", ""];
  }
  for (const [from, to, anchor = ""] of MOVED) {
    if (pathname === from) {
      return [to, anchor];
    }
    if (pathname.startsWith(`${from}/`)) {
      return [`${to}${pathname.slice(from.length)}`, ""];
    }
  }
  return null;
};

/**
 * Links stored in older shapes (notifications, emails, Telegram) open the
 * page's current URL: detail pages that took a query parameter while the
 * app was a static export (`/orders/view?id=…` → `/pass/orders/…`), and
 * pages that moved (`/pass/support/…` → `/help/…`, `/sell` →
 * `/pass/orders#sell`). Other paths are returned unchanged.
 */
export const currentAppPath = (path: string) => {
  const url = new URL(path, "http://site.invalid");
  const legacy = LEGACY_DETAIL_PAGES[url.pathname];
  const value = legacy ? url.searchParams.get(legacy[1]) : null;
  if (legacy && value) {
    url.searchParams.delete(legacy[1]);
    const query = url.searchParams.toString();
    return `${legacy[0]}/${encodeURIComponent(value)}${query ? `?${query}` : ""}`;
  }
  const current = moved(url.pathname);
  if (!current) {
    return path;
  }
  return `${current[0]}${url.search}${url.hash || current[1]}`;
};

const BUSINESS_PATH = /^\/business(?=[/?#]|$)/;

/**
 * The page of The IDEA Business a stored link names: links under
 * `/business…` are its pages, which sit at the root of its own site
 * (`/business/invoices` → `/invoices`); null for the website's pages.
 */
export const businessPath = (path: string) =>
  BUSINESS_PATH.test(path) ? path.replace(BUSINESS_PATH, "") || "/" : null;
