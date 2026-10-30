import "server-only";

import type { StaffRole } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { formatters } from "./format";
import { searchTerm } from "./list";
import { canRead } from "./roles";
import type { ServerClient } from "./session";

const DIGITS = /^\d{1,18}$/;
const LIMIT = 8;

export interface SearchHit {
  detail?: string;
  href: string;
  id: string;
  label: string;
}

export interface SearchGroup {
  hits: SearchHit[];
  id: "orders" | "members" | "products" | "tickets" | "requests";
  title: string;
}

/**
 * Search across Staff (the /search page and the command bar): order,
 * ticket and request numbers, members by name or Pass number, products
 * and ticket subjects, at most 8 of each, only in the sections the role
 * can read. Every query runs as the staff member (RLS applies).
 */
export const searchStaff = async (
  supabase: ServerClient,
  role: StaffRole,
  locale: Locale,
  raw: string
): Promise<SearchGroup[]> => {
  const q = raw.trim().slice(0, 120);
  const term = searchTerm(q);
  if (!q) {
    return [];
  }
  const t = await getTranslations("admin.search");
  const format = formatters(locale);
  const can = {
    catalog: canRead(role, "catalog"),
    companies: canRead(role, "companies"),
    customers: canRead(role, "customers"),
    orders: canRead(role, "orders"),
    support: canRead(role, "support"),
  };
  const number = DIGITS.test(q) ? Number(q) : null;
  const like = `%${term}%`;
  /** A number matches the record's number; anything else the text column. */
  const numberOr = (column: string) =>
    number ? `number.eq.${number}` : `${column}.ilike.${like}`;
  const when = <T>(allowed: boolean, query: () => PromiseLike<T>) =>
    allowed ? query() : Promise.resolve({ data: null });
  const searchable = Boolean(term);

  const [orders, members, products, tickets, requests] = await Promise.all([
    when(can.orders && number !== null, () =>
      supabase
        .from("orders")
        .select("id, number, status, total")
        .eq("number", number ?? 0)
        .limit(LIMIT)
    ),
    when(can.customers && searchable, () =>
      supabase
        .from("profiles")
        .select("id, full_name, member_number")
        .or(number ? `member_number.eq.${number}` : `full_name.ilike.${like}`)
        .limit(LIMIT)
    ),
    when(can.catalog && searchable, () =>
      supabase
        .from("products")
        .select("id, name_en, name_ar, kind")
        .or(`name_en.ilike.${like},name_ar.ilike.${like},slug.ilike.${like}`)
        .limit(LIMIT)
    ),
    when(can.support && searchable, () =>
      supabase
        .from("support_tickets")
        .select("id, number, subject, status")
        .or(numberOr("subject"))
        .limit(LIMIT)
    ),
    when(can.companies && searchable, () =>
      supabase
        .from("procurement_requests")
        .select("id, number, title, organizations (name)")
        .or(numberOr("title"))
        .limit(LIMIT)
    ),
  ]);

  const groups: SearchGroup[] = [
    {
      hits: (orders.data ?? []).map((row) => ({
        detail: format.money(row.total),
        href: `/orders/${row.id}`,
        id: row.id,
        label: t("order", { number: String(row.number) }),
      })),
      id: "orders",
      title: t("orders"),
    },
    {
      hits: (members.data ?? []).map((row) => ({
        detail: row.member_number ? `№ ${row.member_number}` : undefined,
        href: `/customers/${row.id}`,
        id: row.id,
        label: row.full_name ?? t("unnamed"),
      })),
      id: "members",
      title: t("members"),
    },
    {
      hits: (products.data ?? []).map((row) => ({
        href: `/catalog/products/${row.id}`,
        id: row.id,
        label: locale === "ar" ? row.name_ar : row.name_en,
      })),
      id: "products",
      title: t("products"),
    },
    {
      hits: (tickets.data ?? []).map((row) => ({
        detail: row.subject,
        href: `/support/${row.id}`,
        id: row.id,
        label: t("ticket", { number: String(row.number) }),
      })),
      id: "tickets",
      title: t("tickets"),
    },
    {
      hits: (requests.data ?? []).map((row) => ({
        detail: row.organizations?.name,
        href: `/partners/team/${row.id}`,
        id: row.id,
        label: `${t("request", { number: String(row.number) })} · ${row.title}`,
      })),
      id: "requests",
      title: t("requests"),
    },
  ];
  return groups.filter((group) => group.hits.length > 0);
};
