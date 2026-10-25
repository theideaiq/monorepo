/**
 * The site's menu, matching the phone tabs: Shop, Rent and Discover, then
 * The IDEA Suite for companies and About & info. Labels come from
 * `web.nav.<id>`.
 */

export interface NavigationItem {
  href: string;
  id: "about" | "discover" | "rent" | "shop" | "suite";
}

export const navigationItems: NavigationItem[] = [
  { href: "/", id: "shop" },
  { href: "/plus", id: "rent" },
  { href: "/post", id: "discover" },
  { href: "/suite", id: "suite" },
  { href: "/about", id: "about" },
];

/** Whether `pathname` is the item's page or one below it. */
export const isCurrentItem = (pathname: string, item: NavigationItem) => {
  const below = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);
  switch (item.id) {
    case "shop":
      return pathname === "/" || below("/store");
    case "discover":
      return below("/post") || below("/club");
    case "about":
      return below("/about") || below("/legal");
    default:
      return below(item.href);
  }
};
