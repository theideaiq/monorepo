import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { oneOf, pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "./_components/companies-tabs";
import { requestTone } from "./_components/tones";

const views = ["open", "ordered", "delivered", "cancelled", "all"] as const;

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies");
  return { title: t("title") };
};

/** Procurement requests from companies: the ones waiting on a quote first. */
const CompaniesPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("companies");
  const params = await searchParams;
  const t = await getTranslations("admin.companies");
  const tStatus = await getTranslations("app.company.status");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);
  const view = oneOf(params, "status", views) ?? "open";

  let query = supabase
    .from("procurement_requests")
    .select(
      "id, number, title, budget, needed_by, status, created_at, organizations (name)",
      { count: "exact" }
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);
  if (view === "open") {
    query = query.in("status", ["submitted", "quoted"]);
  } else if (view !== "all") {
    query = query.eq("status", view);
  }
  const { count, data } = await query;
  const requests = data ?? [];

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <CompaniesTabs />
        <FilterBar>
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={view}
            name="status"
            options={views.map((value) => ({
              label:
                value === "open" || value === "all"
                  ? t(`views.${value}`)
                  : tStatus(`request.${value}`),
              value,
            }))}
          />
        </FilterBar>
        {requests.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("request")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("budget")}</TableHead>
                  <TableHead>{t("neededBy")}</TableHead>
                  <TableHead>{t("received")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-80">
                      <Link
                        className="grid gap-0.5 hover:underline"
                        href={`/partners/${request.id}`}
                      >
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {t("number", { number: String(request.number) })}
                        </span>
                        <span className="truncate font-medium">
                          {request.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{request.organizations?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge tone={requestTone[request.status]}>
                        {tStatus(`request.${request.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {format.money(request.budget)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(request.needed_by)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.dateTime(request.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/partners"
        />
      </PageBody>
    </>
  );
};

export default CompaniesPage;
