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
import { EditorialTabs } from "../_components/editorial-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.tabs");
  return { title: t("opportunities") };
};

const COLUMNS =
  "id, kind, title_ar, title_en, status, deadline, submitted_at, featured_until, organization:organizations (name)" as const;

/**
 * Opportunities: organizations' listings waiting for review first (oldest
 * first), then every listing, The IDEA's own included.
 */
const OpportunitiesPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("editorial");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const [{ data: pending }, { count, data: all }] = await Promise.all([
    supabase
      .from("opportunities")
      .select(COLUMNS)
      .eq("status", "pending")
      .order("submitted_at")
      .limit(50),
    supabase
      .from("opportunities")
      .select(COLUMNS, { count: "exact" })
      .neq("status", "pending")
      .order("updated_at", { ascending: false })
      .range(from, to),
  ]);
  const now = Date.now();

  const rows = (list: typeof all) =>
    (list ?? []).map((row) => {
      const organization = Array.isArray(row.organization)
        ? row.organization[0]
        : row.organization;
      const featured =
        row.featured_until && new Date(row.featured_until).getTime() > now;
      return (
        <TableRow key={row.id}>
          <TableCell>
            <Link
              className="font-medium hover:underline"
              href={`/club/opportunities/${row.id}`}
            >
              {localized(row, "title", locale)}
            </Link>
            {featured ? (
              <span className="ms-2 text-muted-foreground text-xs">
                {t("opportunities.featured")}
              </span>
            ) : null}
          </TableCell>
          <TableCell>{t(`opportunities.kinds.${row.kind}`)}</TableCell>
          <TableCell>
            {organization?.name ?? t("opportunities.theIdea")}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {row.deadline
              ? format.dateTime(row.deadline)
              : t("opportunities.rolling")}
          </TableCell>
          <TableCell>
            <StatusBadge status={row.status}>
              {t(
                `opportunities.statuses.${row.status as "approved" | "changes" | "closed" | "draft" | "pending" | "rejected"}`
              )}
            </StatusBadge>
          </TableCell>
        </TableRow>
      );
    });

  const head = (
    <TableHeader>
      <TableRow>
        <TableHead>{t("opportunities.title")}</TableHead>
        <TableHead>{t("opportunities.kind")}</TableHead>
        <TableHead>{t("opportunities.runBy")}</TableHead>
        <TableHead>{t("opportunities.deadline")}</TableHead>
        <TableHead>{t("opportunities.status")}</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/club/opportunities/new">
              <PlusIcon />
              {t("opportunities.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <EditorialTabs />
      <PageBody>
        <div id="review" />
        <Panel
          description={t("opportunities.reviewDescription")}
          title={t("opportunities.reviewTitle")}
        >
          {(pending ?? []).length === 0 ? (
            <EmptyState title={t("opportunities.reviewEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                {head}
                <TableBody>{rows(pending)}</TableBody>
              </Table>
            </div>
          )}
        </Panel>
        {(all ?? []).length === 0 ? (
          <EmptyState title={t("opportunities.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              {head}
              <TableBody>{rows(all)}</TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/club/opportunities"
        />
      </PageBody>
    </>
  );
};

export default OpportunitiesPage;
