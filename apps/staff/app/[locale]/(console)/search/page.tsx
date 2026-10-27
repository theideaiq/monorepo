import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { param, type SearchParams, searchTerm } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { canRead } from "@/lib/admin/roles";
import type { ServerClient } from "@/lib/admin/session";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.search");
  return { title: t("title") };
};

const DIGITS = /^\d{1,18}$/;
const LIMIT = 8;

interface Hit {
  detail?: string;
  href: string;
  id: string;
  label: string;
}

/** Looks the query up in each section the role can read, at most 8 hits each. */
const search = async (
  supabase: ServerClient,
  can: Record<
    "catalog" | "customers" | "orders" | "companies" | "support",
    boolean
  >,
  q: string
) => {
  const term = searchTerm(q);
  const number = DIGITS.test(q) ? Number(q) : null;
  const like = `%${term}%`;
  /** A number matches the record's number; anything else the text column. */
  const numberOr = (column: string) =>
    number ? `number.eq.${number}` : `${column}.ilike.${like}`;
  const when = <T,>(allowed: boolean, query: () => PromiseLike<T>) =>
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

  return { members, orders, products, requests, tickets };
};

/** Search across Staff, grouped by section. */
const SearchPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("dashboard");
  const t = await getTranslations("admin.search");
  const locale = await getLocale();
  const format = formatters(locale);
  const q = param(await searchParams, "q")
    .trim()
    .slice(0, 120);
  const can = {
    catalog: canRead(staff.role, "catalog"),
    companies: canRead(staff.role, "companies"),
    customers: canRead(staff.role, "customers"),
    orders: canRead(staff.role, "orders"),
    support: canRead(staff.role, "support"),
  };

  const found = q ? await search(supabase, can, q) : null;
  const groups: { hits: Hit[]; id: string; title: string }[] = found
    ? [
        {
          hits: (found.orders.data ?? []).map((row) => ({
            detail: format.money(row.total),
            href: `/orders/${row.id}`,
            id: row.id,
            label: t("order", { number: String(row.number) }),
          })),
          id: "orders",
          title: t("orders"),
        },
        {
          hits: (found.members.data ?? []).map((row) => ({
            detail: row.member_number ? `№ ${row.member_number}` : undefined,
            href: `/customers/${row.id}`,
            id: row.id,
            label: row.full_name ?? t("unnamed"),
          })),
          id: "members",
          title: t("members"),
        },
        {
          hits: (found.products.data ?? []).map((row) => ({
            href: `/catalog/products/${row.id}`,
            id: row.id,
            label: locale === "ar" ? row.name_ar : row.name_en,
          })),
          id: "products",
          title: t("products"),
        },
        {
          hits: (found.tickets.data ?? []).map((row) => ({
            detail: row.subject,
            href: `/support/${row.id}`,
            id: row.id,
            label: t("ticket", { number: String(row.number) }),
          })),
          id: "tickets",
          title: t("tickets"),
        },
        {
          hits: (found.requests.data ?? []).map((row) => ({
            detail: row.organizations?.name,
            href: `/partners/${row.id}`,
            id: row.id,
            label: `${t("request", { number: String(row.number) })} · ${row.title}`,
          })),
          id: "requests",
          title: t("requests"),
        },
      ].filter((group) => group.hits.length > 0)
    : [];

  return (
    <>
      <PageHeader
        description={q ? t("for", { query: q }) : t("hint")}
        title={t("title")}
      />
      <PageBody>
        {q && groups.length === 0 ? <EmptyState title={t("empty")} /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Panel key={group.id} title={group.title}>
              <ul className="divide-y text-sm">
                {group.hits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      className="flex items-center justify-between gap-3 py-2 hover:underline"
                      href={hit.href}
                    >
                      <span className="font-medium">{hit.label}</span>
                      {hit.detail ? (
                        <span className="truncate text-muted-foreground">
                          {hit.detail}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </PageBody>
    </>
  );
};

export default SearchPage;
