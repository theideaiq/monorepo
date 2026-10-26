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
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "../_components/companies-tabs";
import { jobTone } from "../_components/tones";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.hiring");
  return { title: t("title") };
};

/** Companies' job requests, open ones first, with candidates to review. */
const CompanyHiringPage = async () => {
  const { supabase } = await requireSection("companies");
  const t = await getTranslations("admin.companies.hiring");
  const tStatus = await getTranslations("app.company.hiring.status.job");
  const format = formatters(await getLocale());

  const { data } = await supabase
    .from("job_requests")
    .select(
      "id, number, title, status, openings, created_at, organizations (name), candidates (status)"
    )
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);
  const jobs = data ?? [];

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        <CompaniesTabs />
        {jobs.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("job")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("candidates")}</TableHead>
                  <TableHead>{t("posted")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const active = job.candidates.filter(
                    (candidate) => candidate.status !== "withdrawn"
                  ).length;
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/companies/hiring/${job.id}`}
                        >
                          {t("number", { number: String(job.number) })} ·{" "}
                          {job.title}
                        </Link>
                      </TableCell>
                      <TableCell>{job.organizations?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge tone={jobTone[job.status]}>
                          {tStatus(job.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{format.number(active)}</TableCell>
                      <TableCell>{format.date(job.created_at)}</TableCell>
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

export default CompanyHiringPage;
