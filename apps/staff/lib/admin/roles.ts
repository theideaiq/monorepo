import type { StaffRole } from "@repo/database";

/**
 * Which staff sections each staff role can use. This only decides what
 * the navigation shows and which pages render; Row Level Security in the
 * database is the real boundary (see the 20261101 migrations), and these
 * levels mirror its policies.
 */
export const sections = [
  "dashboard",
  "counter",
  "catalog",
  "orders",
  "rentals",
  "customers",
  "support",
  "reviews",
  "companies",
  "finance",
  "editorial",
  "telegram",
  "staff",
  "audit",
] as const;

export type Section = (typeof sections)[number];

/** Where each section lives in the console (paths without the locale). */
export const sectionHref: Record<Section, string> = {
  audit: "/settings/audit",
  catalog: "/catalog",
  companies: "/partners",
  counter: "/space",
  customers: "/customers",
  dashboard: "/",
  editorial: "/club",
  finance: "/finance",
  orders: "/orders",
  rentals: "/rentals",
  reviews: "/catalog/reviews",
  staff: "/settings",
  support: "/support",
  telegram: "/club/telegram",
};
export type AccessLevel = "read" | "write";

export const staffRoles = [
  "superadmin",
  "admin",
  "editor",
  "finance",
  "marketing",
  "support",
] as const satisfies readonly StaffRole[];

type AccessMap = Partial<Record<Section, AccessLevel>>;

const everything = (exclude: Section[] = []): AccessMap =>
  Object.fromEntries(
    sections
      .filter((section) => !exclude.includes(section))
      .map((section) => [section, "write"])
  );

const roleAccess: Record<StaffRole, AccessMap> = {
  admin: everything(["staff"]),
  editor: { dashboard: "read", editorial: "write" },
  finance: {
    // Finance invoices purchase orders; support handles the rest.
    companies: "write",
    dashboard: "read",
    finance: "write",
    orders: "read",
  },
  marketing: { customers: "read", dashboard: "read" },
  superadmin: everything(),
  support: {
    companies: "write",
    // The counter: checking Pass cards, Bulbs and rentals in person.
    counter: "write",
    customers: "write",
    dashboard: "read",
    orders: "write",
    rentals: "write",
    reviews: "write",
    support: "write",
    telegram: "write",
  },
};

/** The role's access to a section, or null when it can't open it. */
export const accessTo = (
  role: StaffRole | null | undefined,
  section: Section
): AccessLevel | null => (role ? (roleAccess[role][section] ?? null) : null);

export const canRead = (role: StaffRole | null | undefined, section: Section) =>
  accessTo(role, section) !== null;

export const canWrite = (
  role: StaffRole | null | undefined,
  section: Section
) => accessTo(role, section) === "write";

/**
 * The menu, in order: each entry opens its first section the role can
 * read; the others it can read are listed under it. Entries with nothing
 * the role can read are hidden. Sellers and payouts joins when selling
 * ships.
 */
export const menu = [
  { id: "inbox", sections: ["dashboard", "support"] },
  { id: "catalog", sections: ["catalog", "reviews"] },
  { id: "orders", sections: ["orders"] },
  { id: "rentals", sections: ["rentals"] },
  { id: "customers", sections: ["customers"] },
  { id: "club", sections: ["editorial", "telegram"] },
  { id: "partners", sections: ["companies"] },
  { id: "space", sections: ["counter"] },
  { id: "finance", sections: ["finance"] },
  { id: "settings", sections: ["staff", "audit"] },
] as const satisfies readonly { id: string; sections: readonly Section[] }[];

export type MenuId = (typeof menu)[number]["id"];

export interface MenuEntry {
  id: MenuId;
  /** The section whose name the entry shows (Club for editorial). */
  label: Section;
  /** The sections the role can read, the entry's own page first. */
  sections: Section[];
}

/** The menu entries the role can use, each with only its readable sections. */
export const visibleMenu = (role: StaffRole | null | undefined): MenuEntry[] =>
  menu
    .map((entry) => ({
      id: entry.id,
      label: entry.sections[0],
      sections: entry.sections.filter((section) => canRead(role, section)),
    }))
    .filter((entry) => entry.sections.length > 0);

/** Sections shown in the navigation, in order. */
export const visibleSections = (role: StaffRole | null | undefined) =>
  sections.filter((section) => canRead(role, section));

export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === "string" &&
  (staffRoles as readonly string[]).includes(value);
