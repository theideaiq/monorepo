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
  ["/support", "/help"],
  ["/pass/support", "/help"],
  ["/pass/plus", "/plus", "#yours"],
  ["/pass/wishlist", "/pass/saved"],
  ["/pass/events", "/club", "#yours"],
  ["/pass/submissions", "/club", "#yours"],
  // Get offers from shops left the Pass (owner, 30 October 2026).
  ["/pass/selling", "/pass"],
  // Program notifications link to Club → Yours (`?tab=applications`).
  ["/club/yours", "/club", "#yours"],
  ["/post/events", "/club"],
  ["/post", "/club"],
  ["/suite", "/business"],
  ["/about/careers", "/careers"],
  ["/about/faq", "/help"],
  ["/about/contact", "/help", "#contact"],
  ["/i", "/r"],
];

/**
 * Sections of a page that moved to another page, by path and anchor: the
 * student and verification cards left Pass → Settings for /verify.
 */
const MOVED_SECTIONS: Record<string, string> = {
  "/pass/settings#student": "/verify?kind=student",
  "/pass/settings#verification": "/verify",
};

/** Sections of /post that were pages, now topics of the Club's Read feed. */
const POST_SECTIONS: Record<string, string> = {
  "/post/learn": "/club?topic=guides",
  "/post/news": "/club?topic=news",
  "/post/stories": "/club?topic=stories",
};

/** News, stories and guides were `/club?show=…`; they are Read's topics now. */
const CLUB_TOPICS = new Set(["news", "stories", "guides"]);

const moved = (pathname: string): [string, string] | null => {
  const section = POST_SECTIONS[pathname];
  if (section) {
    return [section, "#read"];
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
 * pages that moved (`/pass/support/…` → `/help/…`, `/pass/plus` →
 * `/plus#yours`, `/club?show=news` → `/club?topic=news#read`). Other paths
 * are returned unchanged.
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
  const section = MOVED_SECTIONS[`${url.pathname}${url.hash}`];
  if (section) {
    return section;
  }
  const show = url.searchParams.get("show");
  if (url.pathname === "/club" && show && CLUB_TOPICS.has(show)) {
    return `/club?topic=${show}${url.hash || "#read"}`;
  }
  const current = moved(url.pathname);
  if (!current) {
    return path;
  }
  const [page, anchor] = current;
  const query = page.includes("?") ? url.search.replace("?", "&") : url.search;
  return `${page}${query}${url.hash || anchor}`;
};

const BUSINESS_PATH = /^\/business(?=[/?#]|$)/;

/**
 * Partners' sections stored at their own address, without `/business`
 * (the auction notifications link `/selling/auctions`; newer links use
 * `/sell/…` and `/settings/…`).
 */
const PARTNERS_SECTION = /^\/(selling|sell|organization)(?=[/?#]|$)/;

/**
 * Pages of Partners that moved, as [old path, current path, how]. By
 * default the pages under an old path move with it (`/selling/orders` →
 * `/sell/orders`); `"page"` sends the page and anything under it to one
 * page, `"exact"` matches only the page itself. `/selling` and
 * `/selling/pickup` became Shop settings, `/selling/sales` Promotions and
 * `/organization/*` `/settings/*` (owner, 30 October 2026); Get offers
 * from shops was removed.
 */
const PARTNERS_MOVED: readonly (readonly [
  string,
  string,
  ("exact" | "page")?,
])[] = [
  ["/procurement", "/team"],
  ["/invoices", "/settings/invoices"],
  ["/members", "/settings/members"],
  ["/plus", "/team/plus"],
  ["/billing", "/settings/billing"],
  ["/selling/get-offers", "/sell/settings", "page"],
  ["/selling/pickup", "/sell/settings", "page"],
  ["/selling/sales", "/sell/promotions"],
  ["/selling", "/sell/settings", "exact"],
  ["/selling", "/sell"],
  ["/organization", "/settings"],
];

/** The current address of a page at the root of Partners' site. */
const currentPartnersPage = (page: string) => {
  const url = new URL(page, "http://site.invalid");
  const rest = `${url.search}${url.hash}`;
  for (const [from, to, how] of PARTNERS_MOVED) {
    const under = url.pathname.startsWith(`${from}/`);
    if (url.pathname === from || (under && how === "page")) {
      return `${to}${rest}`;
    }
    if (under && !how) {
      return `${to}${page.slice(from.length)}`;
    }
  }
  return page;
};

/**
 * The page of Partners a stored link names, at its current address:
 * links under `/business…` are its pages, which sit at the root of its own
 * site (`/business/invoices` → `/settings/invoices`,
 * `/business/procurement/7` → `/team/7`), and its sections stored without
 * the prefix (`/selling/auctions` → `/sell/auctions`); null for the
 * website's pages.
 */
export const businessPath = (path: string) => {
  if (PARTNERS_SECTION.test(path)) {
    return currentPartnersPage(path);
  }
  if (!BUSINESS_PATH.test(path)) {
    return null;
  }
  return currentPartnersPage(path.replace(BUSINESS_PATH, "") || "/");
};
