import type { StaffRole } from "@repo/database";
import type { SectionTab } from "@/components/admin/section-tabs";
import { canRead } from "@/lib/admin/roles";

/** The rental lists of Plus and the statuses each shows. */
export const RENTAL_VIEWS = {
  back: ["active", "overdue"],
  history: ["returned", "cancelled", "kept"],
  ship: ["requested"],
} as const;

export type RentalView = keyof typeof RENTAL_VIEWS;

/** Where each rental list lives. */
export const rentalViewHref: Record<RentalView, string> = {
  back: "/plus/coming-back",
  history: "/plus/history",
  ship: "/plus",
};

type TabKey =
  | "ship"
  | "back"
  | "swaps"
  | "kits"
  | "members"
  | "demand"
  | "plans"
  | "history";

/**
 * Plus's tabs: To ship · Coming back · Swaps · Kits · Members · Demand ·
 * Plans (for roles that can open the catalog, which holds the plans) and
 * the rentals already back.
 */
export const plusTabs = (
  label: (key: `tabs.${TabKey}`) => string,
  role: StaffRole
): SectionTab[] => [
  { exact: true, href: "/plus", label: label("tabs.ship") },
  { href: "/plus/coming-back", label: label("tabs.back") },
  { href: "/plus/swaps", label: label("tabs.swaps") },
  { href: "/plus/kits", label: label("tabs.kits") },
  { href: "/plus/members", label: label("tabs.members") },
  { href: "/plus/demand", label: label("tabs.demand") },
  ...(canRead(role, "catalog")
    ? [{ href: "/plus/plans", label: label("tabs.plans") }]
    : []),
  { href: "/plus/history", label: label("tabs.history") },
];
