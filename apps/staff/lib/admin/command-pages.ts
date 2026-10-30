import type { StaffRole } from "@repo/database";
import {
  canRead,
  type MenuId,
  type Section,
  sectionHref,
  visibleMenu,
} from "./roles";

/**
 * The pages the command bar jumps to: every menu entry and section the
 * role can read, then the pages inside them. Labels come from
 * `admin.nav.<section>` and `admin.command.pages.<id>`.
 */
export const subPages = [
  { href: "/plus/coming-back", id: "plusBack", section: "rentals" },
  { href: "/plus/swaps", id: "plusSwaps", section: "rentals" },
  { href: "/plus/kits", id: "plusKits", section: "rentals" },
  { href: "/plus/members", id: "plusMembers", section: "rentals" },
  { href: "/plus/demand", id: "plusDemand", section: "rentals" },
  { href: "/plus/history", id: "plusHistory", section: "rentals" },
  { href: "/plus/plans", id: "plusPlans", section: "catalog" },
  { href: "/orders/returns", id: "returns", section: "orders" },
  { href: "/orders/shop-lines", id: "shopLines", section: "orders" },
  { href: "/catalog/checks", id: "checks", section: "catalog" },
  { href: "/catalog/offers", id: "offers", section: "catalog" },
  { href: "/catalog/auctions", id: "auctions", section: "catalog" },
  { href: "/catalog/campaigns", id: "campaigns", section: "catalog" },
  { href: "/catalog/categories", id: "categories", section: "catalog" },
  { href: "/catalog/import", id: "import", section: "catalog" },
  { href: "/catalog/products/new", id: "newProduct", section: "catalog" },
  {
    href: "/customers/verifications",
    id: "verifications",
    section: "customers",
  },
  { href: "/customers/students", id: "students", section: "customers" },
  { href: "/customers/surveys", id: "surveys", section: "customers" },
  { href: "/club/events", id: "events", section: "editorial" },
  { href: "/club/opportunities", id: "opportunities", section: "editorial" },
  { href: "/club/submissions", id: "submissions", section: "editorial" },
  { href: "/partners/shops", id: "shops", section: "companies" },
  { href: "/partners/orders", id: "partnerOrders", section: "companies" },
  { href: "/partners/invoices", id: "invoices", section: "companies" },
  { href: "/partners/perks", id: "perks", section: "companies" },
  { href: "/finance/payouts", id: "payouts", section: "finance" },
  { href: "/finance/coupons", id: "coupons", section: "finance" },
  { href: "/finance/codes", id: "codes", section: "finance" },
  { href: "/finance/programs", id: "programs", section: "finance" },
] as const satisfies readonly { href: string; id: string; section: Section }[];

export type SubPageId = (typeof subPages)[number]["id"];

export type CommandPage =
  | {
      href: string;
      id: string;
      kind: "section";
      menu: MenuId;
      section: Section;
    }
  | { href: string; id: SubPageId; kind: "page"; section: Section };

/** The role's pages, menu first, each once. */
export const commandPages = (role: StaffRole | null | undefined) => {
  const pages: CommandPage[] = visibleMenu(role).flatMap((entry) =>
    entry.sections.map((section) => ({
      href: sectionHref[section],
      id: `section:${section}`,
      kind: "section" as const,
      menu: entry.id,
      section,
    }))
  );
  for (const page of subPages) {
    if (canRead(role, page.section)) {
      pages.push({ ...page, kind: "page" });
    }
  }
  const seen = new Set<string>();
  return pages.filter((page) => {
    if (seen.has(page.href)) {
      return false;
    }
    seen.add(page.href);
    return true;
  });
};
