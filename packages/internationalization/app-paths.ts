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
 * Pages that moved, as [old path, current path, extra]. An old path also
 * covers the pages under it (`/pass/support/7` → `/help/7`); the extra (a
 * query such as `topic=guides`, or an anchor) is only added for the page
 * itself.
 */
const MOVED: readonly (readonly [string, string, string?])[] = [
  ["/orders", "/pass/orders"],
  ["/settings", "/pass/settings"],
  ["/support", "/help"],
  ["/pass/support", "/help"],
  ["/pass/plus", "/plus/plan"],
  ["/pass/wishlist", "/pass/saved"],
  ["/pass/events", "/pass/tickets"],
  ["/pass/submissions", "/pass/applications", "tab=submissions"],
  // Get offers from shops left the Pass (owner, 30 October 2026).
  ["/pass/selling", "/pass"],
  // The UX overhaul (owner, 30 October 2026).
  ["/kits", "/store/kits"],
  // One-off rent is gone: its page opens the product.
  ["/rent", "/store"],
  ["/plus/duo", "/family"],
  ["/post/events", "/club/events"],
  ["/post/learn", "/club/read", "topic=guides"],
  ["/post/news", "/club/read", "topic=news"],
  ["/post/stories", "/club/read", "topic=stories"],
  ["/post", "/club/read"],
  ["/suite", "/business"],
  ["/about/careers", "/careers"],
  ["/about/faq", "/help"],
  ["/about/contact", "/help", "#contact"],
  ["/i", "/r"],
  // The UX overhaul (owner, 30 October 2026): kits are in the Store, and
  // one-off rent is gone (its links open the product).
  ["/kits", "/store/kits"],
  ["/rent", "/store"],
];

/** The Club's pages at `/club/<part>`; another `/club/<slug>` was a post or an event. */
const CLUB_PARTS = new Set(["events", "opportunities", "read", "surveys"]);

/** Club → Join's `?show=` filters, each a page now. */
const CLUB_SHOW: Record<string, string> = {
  events: "/club/events",
  opportunities: "/club/opportunities",
  surveys: "/club/surveys",
};

/** News, stories and guides were `/club?show=…`; they are Read's topics. */
const CLUB_TOPICS = new Set(["news", "stories", "guides"]);

/** Club → Yours' tabs besides tickets and applications, now on /pass/applications. */
const YOURS_TABS = new Set(["surveys", "submissions", "following"]);

/** Pass → Settings' sections (`/pass/settings#…`), each a page now. */
const SETTINGS_SECTIONS: Record<string, string> = {
  addresses: "/pass/settings/addresses",
  appearance: "/pass/settings/appearance",
  birthday: "/pass/settings/profile",
  connections: "/pass/settings/connections",
  delete: "/pass/settings/privacy",
  email: "/pass/settings/sign-in",
  guardian: "/pass/family",
  messages: "/pass/settings/notifications",
  more: "/pass/settings",
  password: "/pass/settings/sign-in",
  phone: "/pass/settings/phone",
  profile: "/pass/settings/profile",
  sites: "/pass/settings/connections",
  student: "/verify?kind=student",
  telegram: "/pass/settings/connections",
  verification: "/verify",
  whatsapp: "/pass/settings/notifications",
};

/** Pass → Saved's tabs (`/pass/saved?tab=…`), each a page now. */
const SAVED_TABS: Record<string, string> = {
  lists: "/pass/lists",
  queue: "/pass/queue",
  saved: "/pass/saved",
};

/**
 * What a stored link belongs to, where its path can't tell: the
 * notification's event and kind (`plus_swap_booked`, `rental`), or the
 * table a Club item came from.
 */
export interface StoredLinkContext {
  readonly event?: string | null;
  readonly item?: "event" | "post" | null;
  readonly kind?: string | null;
}

/**
 * Your Plus (`/plus#yours`) held the plan, the rentals at home and the Duo:
 * rentals and swaps open At home, the Duo opens Family, the rest your plan.
 */
const yoursPage = ({ event, kind }: StoredLinkContext) => {
  if (
    kind === "rental" ||
    event?.startsWith("rental_") ||
    event?.startsWith("plus_swap")
  ) {
    return "/pass/at-home";
  }
  if (event?.startsWith("plus_duo") || event?.startsWith("family_")) {
    return "/pass/family";
  }
  return "/plus/plan";
};

/** Club → Yours (`/club#yours`, `/club/yours?tab=…`): tickets, or the rest. */
const clubYoursPage = (tab: string | null, { event }: StoredLinkContext) => {
  if (tab === "applications" || event?.startsWith("program_")) {
    return "/pass/applications";
  }
  if (tab && YOURS_TABS.has(tab)) {
    return `/pass/applications?tab=${tab}`;
  }
  if (event?.startsWith("survey_")) {
    return "/pass/applications?tab=surveys";
  }
  return "/pass/tickets";
};

/** A query string without some parameters, with its `?` (or empty). */
const queryWithout = (params: URLSearchParams, ...names: string[]) => {
  const rest = new URLSearchParams(params);
  for (const name of names) {
    rest.delete(name);
  }
  const query = rest.toString();
  return query ? `?${query}` : "";
};

/** A page (which may hold a query) and a query string (`?…` or empty). */
const withQuery = (page: string, query: string) =>
  page.includes("?") && query ? `${page}&${query.slice(1)}` : `${page}${query}`;

/** `/club?…` in an older shape, at its current address; null when current. */
const clubHomePage = (url: URL) => {
  const { hash, searchParams } = url;
  const show = searchParams.get("show");
  const topic = searchParams.get("topic");
  const rest = queryWithout(searchParams, "show", "topic", "tab");
  if (show && CLUB_TOPICS.has(show)) {
    return withQuery(`/club/read?topic=${show}`, rest);
  }
  const shown = show ? CLUB_SHOW[show] : undefined;
  if (shown) {
    return withQuery(shown, rest);
  }
  if (topic) {
    return withQuery(`/club/read?topic=${topic}`, rest);
  }
  if (hash === "#read") {
    return withQuery("/club/read", rest);
  }
  return hash === "#join" ? `/club${url.search}` : null;
};

/** `/club…` in an older shape, at its current address; null when current. */
const clubPage = (url: URL, context: StoredLinkContext) => {
  const { hash, pathname, searchParams } = url;
  if (
    pathname === "/club/yours" ||
    (pathname === "/club" && hash === "#yours")
  ) {
    return withQuery(
      clubYoursPage(searchParams.get("tab"), context),
      queryWithout(searchParams, "tab")
    );
  }
  if (pathname === "/club") {
    return clubHomePage(url);
  }
  const [, , part, ...more] = pathname.split("/");
  if (!part || CLUB_PARTS.has(part) || more.length > 0) {
    return null;
  }
  // `/club/<slug>` was a post or an event.
  const page = context.item === "event" ? "/club/events" : "/club/read";
  return `${page}/${part}${url.search}${hash}`;
};

/** `/pass/settings#…` and `/pass/saved?tab=…` at their pages; else null. */
const passPage = (url: URL) => {
  const { hash, pathname, searchParams } = url;
  if (pathname === "/pass/settings") {
    const page = hash ? SETTINGS_SECTIONS[hash.slice(1)] : undefined;
    if (page) {
      return withQuery(page, url.search);
    }
    // A teen's invite to their guardian (`?guardian=<code>#guardian`).
    return searchParams.has("guardian") ? `/pass/family${url.search}` : null;
  }
  const tab = searchParams.get("tab");
  const saved = tab ? SAVED_TABS[tab] : undefined;
  if (pathname === "/pass/saved" && saved) {
    return `${withQuery(saved, queryWithout(searchParams, "tab"))}${hash}`;
  }
  return null;
};

const moved = (url: URL): string | null => {
  const { hash, pathname, search } = url;
  for (const [from, to, extra = ""] of MOVED) {
    if (pathname === from) {
      if (extra.startsWith("#")) {
        return `${to}${search}${hash || extra}`;
      }
      return `${withQuery(extra ? `${to}?${extra}` : to, search)}${hash}`;
    }
    if (pathname.startsWith(`${from}/`)) {
      return `${to}${pathname.slice(from.length)}${search}${hash}`;
    }
  }
  return null;
};

/**
 * Links stored in older shapes (notifications, emails, Telegram, posts)
 * open the page's current URL: detail pages that took a query parameter
 * while the app was a static export (`/orders/view?id=…` →
 * `/pass/orders/…`), pages that moved (`/pass/support/…` → `/help/…`,
 * `/kits/<kit>` → `/store/kits/<kit>`, `/plus/duo/<code>` →
 * `/family/<code>`) and parts of pages that became pages (`/plus#join` →
 * `/plus/plans`, `/club#yours` → `/pass/tickets`, `/pass/settings#phone`
 * → `/pass/settings/phone`, `/pass/saved?tab=queue` → `/pass/queue`).
 * `context` says what a link belongs to where its path can't:
 * `/plus#yours` opens your plan, At home or Family by the notification's
 * event, `/club/<slug>` a post (or, for an event, `/club/events/<slug>`).
 * Other paths are returned unchanged.
 */
export const currentAppPath = (
  path: string,
  context: StoredLinkContext = {}
) => {
  const url = new URL(path, "http://site.invalid");
  const legacy = LEGACY_DETAIL_PAGES[url.pathname];
  const value = legacy ? url.searchParams.get(legacy[1]) : null;
  if (legacy && value) {
    url.searchParams.delete(legacy[1]);
    const query = url.searchParams.toString();
    return `${legacy[0]}/${encodeURIComponent(value)}${query ? `?${query}` : ""}`;
  }
  if (url.pathname === "/plus" && url.hash === "#join") {
    return `/plus/plans${url.search}`;
  }
  if (url.pathname === "/plus" && url.hash === "#yours") {
    return withQuery(yoursPage(context), url.search);
  }
  if (url.pathname === "/club" || url.pathname.startsWith("/club/")) {
    return clubPage(url, context) ?? path;
  }
  return passPage(url) ?? moved(url) ?? path;
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
