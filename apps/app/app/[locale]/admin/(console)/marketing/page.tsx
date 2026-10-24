import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Link } from "@/lib/admin/navigation";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { MarketingTabs } from "./_components/marketing-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.marketing");
  return { title: t("title") };
};

const CampaignsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("marketing");
  const params = await searchParams;
  const t = await getTranslations("admin.marketing");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);

  const { count, data: campaigns } = await supabase
    .from("marketing_campaigns")
    .select(
      "id, subject, status, sent_count, sent_at, created_at, marketing_segments(name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/marketing/campaigns/new">
              <PlusIcon />
              {t("campaigns.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <MarketingTabs />
      <PageBody>
        {(campaigns ?? []).length === 0 ? (
          <EmptyState title={t("campaigns.empty")} />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("campaigns.subject")}</TableHead>
                  <TableHead>{t("campaigns.segment")}</TableHead>
                  <TableHead>{t("campaigns.status")}</TableHead>
                  <TableHead className="text-end">
                    {t("campaigns.sentCount")}
                  </TableHead>
                  <TableHead>{t("campaigns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns ?? []).map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/marketing/campaigns/${campaign.id}`}
                      >
                        {campaign.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {campaign.marketing_segments?.name ??
                        t("campaigns.everyone")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status}>
                        {t(`campaignStatus.${campaign.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(campaign.sent_count)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(campaign.sent_at ?? campaign.created_at)}
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
          pathname="/marketing"
        />
      </PageBody>
    </>
  );
};

export default CampaignsPage;
