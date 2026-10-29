import {
  HeartIcon,
  IdCardIcon,
  LightbulbIcon,
  type LucideIcon,
  PackageIcon,
  Settings2Icon,
  TagIcon,
} from "lucide-react";

export type NavKey =
  | "bulbs"
  | "orders"
  | "pass"
  | "saved"
  | "selling"
  | "settings";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/**
 * Your Pass, in six pages: the card, orders, saved items, selling (offers
 * from shops on your own things), Bulbs (with invites) and settings. Plus, support and the member's events live on
 * /plus, /help and /club.
 */
export const navItems: NavItem[] = [
  { href: "/pass", icon: IdCardIcon, key: "pass" },
  { href: "/pass/orders", icon: PackageIcon, key: "orders" },
  { href: "/pass/saved", icon: HeartIcon, key: "saved" },
  { href: "/pass/selling", icon: TagIcon, key: "selling" },
  { href: "/pass/bulbs", icon: LightbulbIcon, key: "bulbs" },
  { href: "/pass/settings", icon: Settings2Icon, key: "settings" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/" || href === "/pass"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
