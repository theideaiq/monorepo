import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { countryName, type RouteStatus } from "@/lib/admin/travel";
import { EditorialTabs } from "../_components/editorial-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.travel");
  return { title: t("title") };
};

/** The Travel Kit's routes: a country and visa type each, by country. */
const TravelRoutesPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("editorial");
  const params = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.editorial");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const { count, data: routes } = await supabase
    .from("travel_routes")
    .select(
      "id, slug, country, visa_ar, visa_en, status, checked_on, travel_requirements (count)",
      { count: "exact" }
    )
    .order("country")
    .order("slug")
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/club/travel/new">
              <PlusIcon />
              {t("travel.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <EditorialTabs />
      <PageBody>
        <Panel description={t("travel.description")} title={t("travel.title")}>
          {(routes ?? []).length === 0 ? (
            <EmptyState title={t("travel.empty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("travel.country")}</TableHead>
                    <TableHead>{t("travel.visa")}</TableHead>
                    <TableHead>{t("travel.status")}</TableHead>
                    <TableHead>{t("travel.checkedOn")}</TableHead>
                    <TableHead className="text-end">
                      {t("travel.requirements")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(routes ?? []).map((route) => {
                    const status = route.status as RouteStatus;
                    return (
                      <TableRow key={route.id}>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            href={`/club/travel/${route.id}`}
                          >
                            {countryName(route.country, locale)}
                          </Link>
                          <span
                            className="ms-2 text-muted-foreground text-xs"
                            dir="ltr"
                          >
                            {route.country}
                          </span>
                        </TableCell>
                        <TableCell>
                          {localized(route, "visa", locale)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={status}>
                            {t(`travel.statuses.${status}`)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {route.checked_on
                            ? format.date(route.checked_on)
                            : t("travel.notChecked")}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {format.number(
                            route.travel_requirements[0]?.count ?? 0
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/club/travel"
        />
      </PageBody>
    </>
  );
};

export default TravelRoutesPage;
