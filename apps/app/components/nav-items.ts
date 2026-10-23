import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CrownIcon,
  HouseIcon,
  type LucideIcon,
  PackageIcon,
  PenLineIcon,
  Settings2Icon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from "lucide-react";

export type NavKey =
  | "business"
  | "cart"
  | "events"
  | "home"
  | "orders"
  | "plus"
  | "settings"
  | "store"
  | "submissions";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/** The signed-in app's sections, in sidebar order. */
export const navItems: NavItem[] = [
  { href: "/", icon: HouseIcon, key: "home" },
  { href: "/store", icon: ShoppingBagIcon, key: "store" },
  { href: "/cart", icon: ShoppingCartIcon, key: "cart" },
  { href: "/orders", icon: PackageIcon, key: "orders" },
  { href: "/plus", icon: CrownIcon, key: "plus" },
  { href: "/events", icon: CalendarDaysIcon, key: "events" },
  { href: "/submissions", icon: PenLineIcon, key: "submissions" },
  { href: "/business", icon: BriefcaseBusinessIcon, key: "business" },
  { href: "/settings", icon: Settings2Icon, key: "settings" },
];

/** The sections in the phone tab bar; the rest are under "More". */
export const tabBarKeys: NavKey[] = ["home", "store", "cart", "orders"];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
