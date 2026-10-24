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
import { Link } from "@repo/internationalization/navigation";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { StatusBadge } from "@/components/status-badge";
import { formatters } from "@/lib/format";
import { publishState } from "@/lib/publishing";
import { requireSection } from "@/lib/session";
import { EditorialTabs } from "../_components/editorial-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.tabs");
  return { title: t("journal") };
};

const JournalIssuesPage = async () => {
  const { canWrite, supabase } = await requireSection("editorial");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const format = formatters(locale);
  const { data: issues } = await supabase
    .from("journal_issues")
    .select("id, volume, issue, title_ar, title_en, published_at, pdf_path")
    .order("volume", { ascending: false })
    .order("issue", { ascending: false });

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/editorial/journal/new">
              <PlusIcon />
              {t("journal.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <EditorialTabs />
      <PageBody>
        {(issues ?? []).length === 0 ? (
          <EmptyState title={t("journal.empty")} />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("journal.number")}</TableHead>
                  <TableHead>{t("journal.title")}</TableHead>
                  <TableHead>{t("publish.state")}</TableHead>
                  <TableHead>{t("publish.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(issues ?? []).map((issue) => {
                  const state = publishState(issue.published_at);
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {t("journal.volumeIssue", {
                          issue: format.number(issue.issue),
                          volume: format.number(issue.volume),
                        })}
                      </TableCell>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/editorial/journal/${issue.id}`}
                        >
                          {localized(issue, "title", locale)}
                        </Link>
                        {issue.pdf_path ? null : (
                          <span className="block text-muted-foreground text-xs">
                            {t("journal.noPdf")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={state}>
                          {t(`publish.states.${state}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{format.date(issue.published_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default JournalIssuesPage;
