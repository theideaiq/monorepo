import {
  CalendarDaysIcon,
  CrownIcon,
  HandCoinsIcon,
  HeartIcon,
  IdCardIcon,
  LifeBuoyIcon,
  LightbulbIcon,
  type LucideIcon,
  PackageIcon,
  PenLineIcon,
  Settings2Icon,
} from "lucide-react";

export type NavKey =
  | "bulbs"
  | "events"
  | "orders"
  | "pass"
  | "plus"
  | "sell"
  | "settings"
  | "submissions"
  | "support"
  | "wishlist";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/** The sections of My Pass, in menu order. */
export const navItems: NavItem[] = [
  { href: "/pass", icon: IdCardIcon, key: "pass" },
  { href: "/pass/bulbs", icon: LightbulbIcon, key: "bulbs" },
  { href: "/pass/orders", icon: PackageIcon, key: "orders" },
  { href: "/pass/plus", icon: CrownIcon, key: "plus" },
  { href: "/pass/wishlist", icon: HeartIcon, key: "wishlist" },
  { href: "/pass/sell", icon: HandCoinsIcon, key: "sell" },
  { href: "/pass/events", icon: CalendarDaysIcon, key: "events" },
  { href: "/pass/submissions", icon: PenLineIcon, key: "submissions" },
  { href: "/pass/support", icon: LifeBuoyIcon, key: "support" },
  { href: "/pass/settings", icon: Settings2Icon, key: "settings" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/" || href === "/pass"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
