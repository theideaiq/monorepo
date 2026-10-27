import type {
  OrganizationFeature,
  OrganizationMembership,
} from "@repo/auth/organizations";
import {
  Building2Icon,
  CodeXmlIcon,
  HouseIcon,
  type LucideIcon,
  PackageSearchIcon,
  TicketPercentIcon,
} from "lucide-react";

export type NavKey =
  | "bulk_buying"
  | "developers"
  | "home"
  | "organization"
  | "perks";

export interface NavItem {
  /** Shown once the organization has switched the section on. */
  feature?: OrganizationFeature;
  href: string;
  icon: LucideIcon;
  key: NavKey;
  /** Only owners and admins see it. */
  managersOnly?: boolean;
}

/**
 * The sections of The IDEA Partners, in sidebar order: Home and
 * Organization always, the rest once added from Home. Selling, Supply and
 * Opportunities join between Home and Perks when they ship.
 */
export const navItems: NavItem[] = [
  { href: "/", icon: HouseIcon, key: "home" },
  { feature: "perks", href: "/perks", icon: TicketPercentIcon, key: "perks" },
  {
    feature: "bulk_buying",
    href: "/bulk-buying",
    icon: PackageSearchIcon,
    key: "bulk_buying",
  },
  {
    feature: "developers",
    href: "/developers",
    icon: CodeXmlIcon,
    key: "developers",
    managersOnly: true,
  },
  { href: "/organization", icon: Building2Icon, key: "organization" },
];

export const isManager = (membership: OrganizationMembership) =>
  membership.role === "owner" || membership.role === "admin";

/** The sections `membership` shows (only Home without an organization). */
export const visibleNavItems = (membership: OrganizationMembership | null) =>
  navItems.filter((item) => {
    if (!membership) {
      return item.key === "home";
    }
    if (item.feature && !membership.features.includes(item.feature)) {
      return false;
    }
    return !item.managersOnly || isManager(membership);
  });

/** Whether `pathname` is inside the section at `href`. */
export const isActivePath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
