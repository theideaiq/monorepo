import {
  IdCardIcon,
  LightbulbIcon,
  type LucideIcon,
  PackageIcon,
  Settings2Icon,
} from "lucide-react";

export type NavKey = "bulbs" | "orders" | "pass" | "settings";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
}

/**
 * Your Pass, in four pages: the card, orders, Bulbs (with invites) and
 * settings. Plus, saved items, support and the
 * member's events live on /plus, /saved, /help and /club.
 */
export const navItems: NavItem[] = [
  { href: "/pass", icon: IdCardIcon, key: "pass" },
  { href: "/pass/orders", icon: PackageIcon, key: "orders" },
  { href: "/pass/bulbs", icon: LightbulbIcon, key: "bulbs" },
  { href: "/pass/settings", icon: Settings2Icon, key: "settings" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/" || href === "/pass"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
