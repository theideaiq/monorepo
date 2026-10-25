import {
  CrownIcon,
  HandCoinsIcon,
  HeartIcon,
  IdCardIcon,
  InfoIcon,
  LifeBuoyIcon,
  LightbulbIcon,
  type LucideIcon,
  MegaphoneIcon,
  PackageIcon,
  Settings2Icon,
} from "lucide-react";

export type NavKey =
  | "about"
  | "affiliate"
  | "bulbs"
  | "orders"
  | "pass"
  | "plus"
  | "sell"
  | "settings"
  | "support"
  | "wishlist";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/**
 * The sections of My Pass, in menu order, then About & info. Your events
 * and submissions open from My Pass's home and from The IDEA Post.
 */
export const navItems: NavItem[] = [
  { href: "/pass", icon: IdCardIcon, key: "pass" },
  { href: "/pass/bulbs", icon: LightbulbIcon, key: "bulbs" },
  { href: "/pass/orders", icon: PackageIcon, key: "orders" },
  { href: "/pass/plus", icon: CrownIcon, key: "plus" },
  { href: "/pass/wishlist", icon: HeartIcon, key: "wishlist" },
  { href: "/pass/sell", icon: HandCoinsIcon, key: "sell" },
  { href: "/pass/affiliate", icon: MegaphoneIcon, key: "affiliate" },
  { href: "/pass/support", icon: LifeBuoyIcon, key: "support" },
  { href: "/pass/settings", icon: Settings2Icon, key: "settings" },
  { href: "/about", icon: InfoIcon, key: "about" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/" || href === "/pass"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
