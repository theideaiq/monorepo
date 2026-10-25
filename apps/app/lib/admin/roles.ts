import type { StaffRole } from "@repo/database";

/**
 * Which back-office sections each staff role can use. This only decides what
 * the navigation shows and which pages render; Row Level Security in the
 * database is the real boundary (see the 20261101 migrations), and these
 * levels mirror its policies.
 */
export const sections = [
  "dashboard",
  "catalog",
  "orders",
  "rentals",
  "customers",
  "affiliates",
  "support",
  "tradeIns",
  "reviews",
  "finance",
  "editorial",
  "telegram",
  "staff",
  "audit",
] as const;

export type Section = (typeof sections)[number];

/** Where each section lives in the console (paths without the locale). */
export const sectionHref: Record<Section, string> = {
  affiliates: "/affiliates",
  audit: "/audit",
  catalog: "/catalog",
  customers: "/customers",
  dashboard: "/",
  editorial: "/editorial",
  finance: "/finance",
  orders: "/orders",
  rentals: "/rentals",
  reviews: "/reviews",
  staff: "/staff",
  support: "/support",
  telegram: "/telegram",
  tradeIns: "/trade-ins",
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
  // Finance pays affiliates; marketing approves them (the database checks
  // which of the two each step needs).
  finance: {
    affiliates: "write",
    dashboard: "read",
    finance: "write",
    orders: "read",
  },
  marketing: { affiliates: "write", customers: "read", dashboard: "read" },
  superadmin: everything(),
  support: {
    customers: "write",
    dashboard: "read",
    orders: "write",
    rentals: "write",
    reviews: "write",
    support: "write",
    telegram: "write",
    tradeIns: "write",
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

/** Sections shown in the navigation, in order. */
export const visibleSections = (role: StaffRole | null | undefined) =>
  sections.filter((section) => canRead(role, section));

export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === "string" &&
  (staffRoles as readonly string[]).includes(value);
