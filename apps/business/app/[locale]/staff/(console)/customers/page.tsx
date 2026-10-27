import type { Tables } from "@repo/database";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { MailCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { crmStatuses, customerSorts, orderByContact } from "@/lib/admin/crm";
import { formatters } from "@/lib/admin/format";
import {
  isUuid,
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection, type ServerClient } from "@/lib/admin/session";
import { CheckPass } from "./_components/check-pass";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers");
  return { title: t("title") };
};

const MAX_FILTERED = 1000;

type CrmRow = Pick<
  Tables<"crm_contacts">,
  "last_contacted_at" | "status" | "tags" | "user_id"
>;

const CRM_COLUMNS = "user_id, status, tags, last_contacted_at";

const readFilters = (params: SearchParams) => ({
  optIn: oneOf(params, "optIn", ["yes", "no"] as const),
  q: param(params, "q"),
  sort: oneOf(params, "sort", customerSorts) ?? "joined",
  status: oneOf(params, "crm", crmStatuses),
  suspended: oneOf(params, "suspended", ["yes", "no"] as const),
  tag: searchTerm(param(params, "tag")).toLowerCase(),
});

type Filters = ReturnType<typeof readFilters>;

/**
 * CRM records for the CRM filters or a contact-date sort (crm_contacts has
 * no foreign key to profiles to embed); null when neither applies.
 */
const loadCrmRows = async (
  supabase: ServerClient,
  { sort, status, tag }: Filters
): Promise<CrmRow[] | null> => {
  if (!(status || tag || sort !== "joined")) {
    return null;
  }
  let crm = supabase
    .from("crm_contacts")
    .select(CRM_COLUMNS)
    .order("last_contacted_at", {
      ascending: sort === "contactedOldest",
      nullsFirst: sort === "contactedOldest",
    })
    .limit(MAX_FILTERED);
  if (status) {
    crm = crm.eq("status", status);
  }
  if (tag) {
    crm = crm.contains("tags", [tag]);
  }
  return (await crm).data ?? [];
};

/** The profiles query with the profile filters (and CRM ids) applied. */
const profilesQuery = (
  supabase: ServerClient,
  { optIn, q, suspended }: Filters,
  crmRows: CrmRow[] | null
) => {
  let query = supabase
    .from("profiles")
    .select("id, full_name, locale, created_at, banned_at, marketing_opt_in", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (isUuid(q)) {
    query = query.eq("id", q);
  } else if (searchTerm(q)) {
    query = query.ilike("full_name", `%${searchTerm(q)}%`);
  }
  if (crmRows) {
    const ids = crmRows.map((row) => row.user_id);
    query = query.in("id", ids.length > 0 ? ids : [crypto.randomUUID()]);
  }
  if (suspended) {
    query =
      suspended === "yes"
        ? query.not("banned_at", "is", null)
        : query.is("banned_at", null);
  }
  if (optIn) {
    query = query.eq("marketing_opt_in", optIn === "yes");
  }
  return query;
};

/**
 * Profiles matching the filters, with their CRM rows. Sorted by sign-up
 * date in the database, or by contact date over the CRM records (up to
 * MAX_FILTERED of them), paged in code.
 */
const searchCustomers = async (
  supabase: ServerClient,
  params: SearchParams
) => {
  const { from, size, to } = pageRange(params);
  const filters = readFilters(params);
  const crmRows = await loadCrmRows(supabase, filters);
  const query = profilesQuery(supabase, filters, crmRows);

  if (filters.sort !== "joined" && crmRows) {
    const { count, data } = await query;
    const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));
    const contacts = orderByContact(
      crmRows.filter((row) => byId.has(row.user_id)),
      filters.sort
    ).slice(from, from + size);
    return {
      contacts,
      count,
      filters,
      profiles: contacts.flatMap((row) => {
        const profile = byId.get(row.user_id);
        return profile ? [profile] : [];
      }),
    };
  }

  const { count, data } = await query.range(from, to);
  const profiles = data ?? [];
  const ids = profiles.map((profile) => profile.id);
  const { data: contacts } =
    ids.length > 0
      ? await supabase
          .from("crm_contacts")
          .select(CRM_COLUMNS)
          .in("user_id", ids)
      : { data: [] };

  return { contacts: contacts ?? [], count, filters, profiles };
};

/** Customer search (CRM). */
const CustomersPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("customers");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.customers");
  const format = formatters(locale);
  const { page } = pageRange(params);

  const { contacts, count, filters, profiles } = await searchCustomers(
    supabase,
    params
  );
  const { optIn, q, sort, status, suspended, tag } = filters;
  const crmById = new Map(
    contacts.map((contact) => [contact.user_id, contact])
  );

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      >
        <Link
          className="font-medium text-sm hover:underline"
          href="/customers/students"
        >
          {t("studentsLink")}
        </Link>
        <Link
          className="font-medium text-sm hover:underline"
          href="/customers/surveys"
        >
          {t("surveysLink")}
        </Link>
      </PageHeader>
      <PageBody>
        {canWrite ? <CheckPass /> : null}
        <FilterBar>
          <Input
            aria-label={t("search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("search")}
            type="search"
          />
          <NativeSelect
            aria-label={t("crmStatus")}
            className="w-auto"
            defaultValue={status ?? ""}
            name="crm"
            options={[
              { label: t("anyStatus"), value: "" },
              ...crmStatuses.map((value) => ({
                label: t(`statuses.${value}`),
                value,
              })),
            ]}
          />
          <Input
            aria-label={t("tag")}
            className="w-36"
            defaultValue={tag}
            name="tag"
            placeholder={t("tag")}
          />
          <NativeSelect
            aria-label={t("optIn")}
            className="w-auto"
            defaultValue={optIn ?? ""}
            name="optIn"
            options={[
              { label: t("anyOptIn"), value: "" },
              { label: t("optedIn"), value: "yes" },
              { label: t("notOptedIn"), value: "no" },
            ]}
          />
          <NativeSelect
            aria-label={t("suspendedFilter")}
            className="w-auto"
            defaultValue={suspended ?? ""}
            name="suspended"
            options={[
              { label: t("anyAccount"), value: "" },
              { label: t("activeAccounts"), value: "no" },
              { label: t("suspendedAccounts"), value: "yes" },
            ]}
          />
          <NativeSelect
            aria-label={t("sort")}
            className="w-auto"
            defaultValue={sort}
            name="sort"
            options={customerSorts.map((value) => ({
              label: t(`sorts.${value}`),
              value,
            }))}
          />
        </FilterBar>
        {sort === "joined" ? null : (
          <p className="text-muted-foreground text-sm">{t("sortHint")}</p>
        )}

        {profiles.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("crmStatus")}</TableHead>
                  <TableHead>{t("tags")}</TableHead>
                  <TableHead>{t("lastContacted")}</TableHead>
                  <TableHead>{t("language")}</TableHead>
                  <TableHead>{t("joined")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const contact = crmById.get(profile.id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <Link
                          className="inline-flex items-center gap-2 font-medium hover:underline"
                          href={`/customers/${profile.id}`}
                        >
                          {profile.full_name || t("unnamed")}
                          {profile.marketing_opt_in ? (
                            <MailCheckIcon
                              aria-label={t("optedIn")}
                              className="size-4 text-muted-foreground"
                            />
                          ) : null}
                        </Link>
                        {profile.banned_at ? (
                          <StatusBadge className="ms-2" tone="danger">
                            {t("suspended")}
                          </StatusBadge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {contact ? (
                          <StatusBadge status={contact.status}>
                            {t(`statuses.${contact.status}`)}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {(contact?.tags ?? []).map((item) => (
                            <StatusBadge key={item}>{item}</StatusBadge>
                          ))}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {contact?.last_contacted_at ? (
                          format.date(contact.last_contacted_at)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profile.locale === "en"
                          ? t("languages.en")
                          : t("languages.ar")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(profile.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/customers"
        />
      </PageBody>
    </>
  );
};

export default CustomersPage;
