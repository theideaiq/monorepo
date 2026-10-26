import type { SectionTab } from "@/components/admin/section-tabs";

export const RENTAL_VIEWS = {
  active: ["active", "overdue"],
  history: ["returned", "cancelled", "kept"],
  overdue: ["overdue"],
  requests: ["requested"],
} as const;

export type RentalView = keyof typeof RENTAL_VIEWS;

/**
 * Rentals' tabs: the rental lists by view, then The IDEA Plus swaps and its
 * waitlist, areas and settings. `active` is the list view on /rentals.
 */
export const rentalTabs = (
  label: (key: `views.${RentalView | "plus" | "swaps"}`) => string,
  active: RentalView | null
): SectionTab[] => [
  ...(Object.keys(RENTAL_VIEWS) as RentalView[]).map((key) => ({
    active: key === active,
    href: key === "requests" ? "/rentals" : `/rentals?view=${key}`,
    label: label(`views.${key}`),
  })),
  { href: "/rentals/swaps", label: label("views.swaps") },
  { href: "/rentals/plus", label: label("views.plus") },
];
