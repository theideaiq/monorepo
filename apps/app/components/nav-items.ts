import {
  HeartIcon,
  HistoryIcon,
  HouseIcon,
  IdCardIcon,
  KeyRoundIcon,
  LightbulbIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  PackageIcon,
  Settings2Icon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";

export type NavKey =
  | "atHome"
  | "bulbs"
  | "codes"
  | "family"
  | "history"
  | "lists"
  | "orders"
  | "pass"
  | "queue"
  | "saved"
  | "settings"
  | "tickets";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
  /** Other pages that belong to this item (Tickets holds Applications). */
  match?: readonly string[];
}

/**
 * Your Pass: the card, then the Library (what you bought, borrow, queued,
 * saved and booked), Bulbs, Family and Settings. Every page has its own
 * address under `/pass/…`.
 */
export const navItems: NavItem[] = [
  { href: "/pass", icon: IdCardIcon, key: "pass" },
  { href: "/pass/orders", icon: PackageIcon, key: "orders" },
  { href: "/pass/at-home", icon: HouseIcon, key: "atHome" },
  { href: "/pass/queue", icon: ListOrderedIcon, key: "queue" },
  { href: "/pass/history", icon: HistoryIcon, key: "history" },
  { href: "/pass/saved", icon: HeartIcon, key: "saved" },
  { href: "/pass/lists", icon: ListIcon, key: "lists" },
  {
    href: "/pass/tickets",
    icon: TicketIcon,
    key: "tickets",
    match: ["/pass/applications"],
  },
  { href: "/pass/codes", icon: KeyRoundIcon, key: "codes" },
  { href: "/pass/bulbs", icon: LightbulbIcon, key: "bulbs" },
  { href: "/pass/family", icon: UsersIcon, key: "family" },
  { href: "/pass/settings", icon: Settings2Icon, key: "settings" },
];

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/" || href === "/pass"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

/** Whether `pathname` belongs to the nav item (its page or one it holds). */
export const isActiveItem = (pathname: string, item: NavItem) =>
  isActivePath(pathname, item.href) ||
  (item.match ?? []).some((href) => isActivePath(pathname, href));
