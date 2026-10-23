import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Link } from "@repo/internationalization/navigation";
import { MailCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { NativeSelect } from "@/components/fields";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { formatters } from "@/lib/format";
import {
  isUuid,
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/list";
import { crmStatuses } from "@/lib/segments";
import { requireSection } from "@/lib/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers");
  return { title: t("title") };
};

const MAX_FILTERED = 1000;

/** Customer search (CRM). */
const CustomersPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("customers");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.customers");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const q = param(params, "q");
  const status = oneOf(params, "crm", crmStatuses);
  const tag = searchTerm(param(params, "tag")).toLowerCase();
  const suspended = oneOf(params, "suspended", ["yes", "no"] as const);
  const optIn = oneOf(params, "optIn", ["yes", "no"] as const);

  // CRM filters live in crm_contacts (no foreign key to profiles to embed).
  let crmIds: string[] | null = null;
  if (status || tag) {
    let crm = supabase.from("crm_contacts").select("user_id").limit(MAX_FILTERED);
    if (status) {
      crm = crm.eq("status", status);
    }
    if (tag) {
      crm = crm.contains("tags", [tag]);
    }
    crmIds = ((await crm).data ?? []).map((row) => row.user_id);
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, locale, created_at, banned_at, marketing_opt_in", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (isUuid(q)) {
    query = query.eq("id", q);
  } else if (searchTerm(q)) {
    query = query.ilike("full_name", `%${searchTerm(q)}%`);
  }
  if (crmIds) {
    query = query.in("id", crmIds.length > 0 ? crmIds : [crypto.randomUUID()]);
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

  const { count, data: profiles } = await query;
  const ids = (profiles ?? []).map((profile) => profile.id);
  const { data: contacts } =
    ids.length > 0
      ? await supabase
          .from("crm_contacts")
          .select("user_id, status, tags")
          .in("user_id", ids)
      : { data: [] };
  const crmById = new Map(
    (contacts ?? []).map((contact) => [contact.user_id, contact])
  );

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
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
        </FilterBar>

        {(profiles ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("crmStatus")}</TableHead>
                  <TableHead>{t("tags")}</TableHead>
                  <TableHead>{t("language")}</TableHead>
                  <TableHead>{t("joined")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((profile) => {
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
