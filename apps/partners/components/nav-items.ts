import type {
  MyOrganization,
  OrganizationFeature,
} from "@repo/auth/organizations";
import {
  BadgePercentIcon,
  BriefcaseIcon,
  CodeXmlIcon,
  GavelIcon,
  HandshakeIcon,
  type LucideIcon,
  MessageSquareQuoteIcon,
  PackageIcon,
  PackageOpenIcon,
  SettingsIcon,
  StoreIcon,
  SunIcon,
  TagsIcon,
  TicketPercentIcon,
  Undo2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

export type NavKey =
  | "affiliate"
  | "auctions"
  | "developers"
  | "listings"
  | "offers"
  | "opportunities"
  | "orders"
  | "payouts"
  | "perks"
  | "promotions"
  | "returns"
  | "settings"
  | "shopSettings"
  | "supply"
  | "team"
  | "today";

export type NavGroupKey = "grow" | "organization" | "sell" | "today";

/** The pages whose menu entry shows a count of what needs the shop. */
export type CountKey = "offers" | "orders" | "returns";

export interface NavItem {
  /** Shows a count when something there needs action. */
  count?: CountKey;
  /** Switched on per organization; greyed with "Add" until it is. */
  feature?: OrganizationFeature;
  href: string;
  icon: LucideIcon;
  key: NavKey;
  /** Only owners and admins see it. */
  managersOnly?: boolean;
}

interface NavGroup {
  /** The whole group is one section (Sell is Selling). */
  feature?: OrganizationFeature;
  items: NavItem[];
  key: NavGroupKey;
}

/** The side menu, in order (the spec's Partners table). */
export const navGroups: readonly NavGroup[] = [
  { items: [{ href: "/", icon: SunIcon, key: "today" }], key: "today" },
  {
    feature: "selling",
    items: [
      { href: "/sell/listings", icon: TagsIcon, key: "listings" },
      {
        count: "orders",
        href: "/sell/orders",
        icon: PackageIcon,
        key: "orders",
      },
      {
        count: "offers",
        href: "/sell/offers",
        icon: MessageSquareQuoteIcon,
        key: "offers",
      },
      {
        count: "returns",
        href: "/sell/returns",
        icon: Undo2Icon,
        key: "returns",
      },
      { href: "/sell/auctions", icon: GavelIcon, key: "auctions" },
      { href: "/sell/promotions", icon: BadgePercentIcon, key: "promotions" },
      { href: "/sell/payouts", icon: WalletIcon, key: "payouts" },
      { href: "/sell/settings", icon: StoreIcon, key: "shopSettings" },
    ],
    key: "sell",
  },
  {
    items: [
      {
        feature: "supply",
        href: "/supply",
        icon: PackageOpenIcon,
        key: "supply",
      },
      {
        feature: "opportunities",
        href: "/opportunities",
        icon: BriefcaseIcon,
        key: "opportunities",
      },
      {
        feature: "perks",
        href: "/perks",
        icon: TicketPercentIcon,
        key: "perks",
      },
      {
        feature: "affiliate",
        href: "/affiliate",
        icon: HandshakeIcon,
        key: "affiliate",
      },
    ],
    key: "grow",
  },
  {
    items: [
      { feature: "team", href: "/team", icon: UsersIcon, key: "team" },
      {
        feature: "developers",
        href: "/developers",
        icon: CodeXmlIcon,
        key: "developers",
        managersOnly: true,
      },
      { href: "/settings", icon: SettingsIcon, key: "settings" },
    ],
    key: "organization",
  },
];

/** Where sections are added: the cards under Today. */
export const ADD_SECTIONS_HREF = "/#add-sections";
/** Where a shop applies to sell. */
export const APPLY_HREF = "/sell/settings";

export type MenuEntry =
  /** A page to open. */
  | { item: NavItem; kind: "link" }
  /** A section not switched on: greyed, with "Add". */
  | { feature: OrganizationFeature; icon: LucideIcon; kind: "add" }
  /** Selling is on but the shop isn't approved yet. */
  | { kind: "apply" };

export interface MenuGroup {
  entries: MenuEntry[];
  key: NavGroupKey;
}

export const isManager = (organization: MyOrganization) =>
  organization.role === "owner" || organization.role === "admin";

/**
 * The side menu for `organization` (only Today without one). Sections it
 * hasn't switched on stay in place, greyed with "Add"; Sell is "Apply to
 * sell" until the shop is approved.
 */
export const menuFor = (
  organization: MyOrganization | null,
  shopApproved: boolean
): MenuGroup[] => {
  if (!organization) {
    return [
      {
        entries: [{ item: navGroups[0].items[0], kind: "link" }],
        key: "today",
      },
    ];
  }
  const manager = isManager(organization);
  const on = (feature: OrganizationFeature) =>
    organization.features.includes(feature);

  return navGroups.map((group) => {
    if (group.feature && !on(group.feature)) {
      return {
        entries: [{ feature: group.feature, icon: StoreIcon, kind: "add" }],
        key: group.key,
      };
    }
    if (group.feature === "selling" && !shopApproved) {
      return { entries: [{ kind: "apply" }], key: group.key };
    }
    const entries: MenuEntry[] = [];
    for (const item of group.items) {
      if (item.managersOnly && !manager) {
        continue;
      }
      entries.push(
        item.feature && !on(item.feature)
          ? { feature: item.feature, icon: item.icon, kind: "add" }
          : { item, kind: "link" }
      );
    }
    return { entries, key: group.key };
  });
};

/** Whether `pathname` is inside the page at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
