/**
 * The site's menu, matching the phone tabs: Store, Plus and the Club (The
 * IDEA Pass sits at the end of the header). Labels come from `web.nav.<id>`.
 */

export interface NavigationItem {
  href: string;
  id: "club" | "plus" | "store";
}

export const navigationItems: NavigationItem[] = [
  { href: "/", id: "store" },
  { href: "/plus", id: "plus" },
  { href: "/club", id: "club" },
];

/** Whether `pathname` is the page at `path` or one below it. */
export const isWithin = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

/** Whether `pathname` is the item's page or one below it. */
export const isCurrentItem = (pathname: string, item: NavigationItem) =>
  item.id === "store"
    ? pathname === "/" || isWithin(pathname, "/store")
    : isWithin(pathname, item.href);
