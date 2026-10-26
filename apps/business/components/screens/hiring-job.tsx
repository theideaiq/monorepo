"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useCloseJob,
  useDecideCandidate,
  useJobRequest,
  useOpenCv,
} from "@/lib/hiring-queries";

type Job = NonNullable<ReturnType<typeof useJobRequest>["data"]>;
type Candidate = Job["candidates"][number];

/** A proposed candidate: who they are, their CV, and the company's decision. */
const CandidateCard = ({
  canDecide,
  candidate,
  jobId,
}: {
  readonly canDecide: boolean;
  readonly candidate: Candidate;
  readonly jobId: string;
}) => {
  const t = useTranslations("app.suite.hiring");
  const id = useId();
  const locale = useLocale();
  const { active } = useActiveOrganization();
  const decide = useDecideCandidate(active.id, jobId);
  const openCv = useOpenCv();
  const [note, setNote] = useState(candidate.company_note ?? "");
  const open =
    candidate.status === "proposed" || candidate.status === "shortlisted";

  const choose = (decision: "hired" | "rejected" | "shortlisted") =>
    decide.mutate({ candidate: candidate.id, decision, note });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {candidate.full_name}
          <Badge variant="outline">
            {t(`status.candidate.${candidate.status}`)}
          </Badge>
        </CardTitle>
        <CardDescription>
          {candidate.headline ? `${candidate.headline} · ` : ""}
          {t("proposedOn", { date: formatDate(candidate.created_at, locale) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {candidate.summary ? (
          <p className="whitespace-pre-line text-sm">{candidate.summary}</p>
        ) : null}
        {candidate.cv_path ? (
          <Button
            className="justify-self-start"
            disabled={openCv.isPending}
            onClick={() =>
              candidate.cv_path && openCv.mutate(candidate.cv_path)
            }
            variant="outline"
          >
            <FileTextIcon />
            {t("cv")}
          </Button>
        ) : null}
        {canDecide && open ? (
          <div className="grid gap-3 border-t pt-4">
            <div className="grid gap-2">
              <label className="font-medium text-sm" htmlFor={`${id}-note`}>
                {t("note")}
              </label>
              <Input
                id={`${id}-note`}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("notePlaceholder")}
                value={note}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {candidate.status === "proposed" ? (
                <Button
                  disabled={decide.isPending}
                  onClick={() => choose("shortlisted")}
                  variant="secondary"
                >
                  {t("shortlist")}
                </Button>
              ) : null}
              <Button
                disabled={decide.isPending}
                onClick={() => choose("hired")}
              >
                {t("hire")}
              </Button>
              <Button
                disabled={decide.isPending}
                onClick={() => choose("rejected")}
                variant="outline"
              >
                {t("reject")}
              </Button>
            </div>
            {decide.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {t("decideError")}
              </p>
            ) : null}
          </div>
        ) : null}
        {!open && candidate.company_note ? (
          <p className="text-muted-foreground text-sm">
            {t("yourNote", { note: candidate.company_note })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const JobDetail = ({ jobId }: { jobId: string }) => {
  const t = useTranslations("app.suite.hiring");
  const locale = useLocale();
  const { active, canManage } = useActiveOrganization();
  const job = useJobRequest(jobId);
  const close = useCloseJob(active.id, jobId);

  if (job.isPending) {
    return <SectionSpinner />;
  }
  if (job.isError) {
    return <ErrorState onRetry={() => job.refetch()} />;
  }
  const { data } = job;
  if (!data || data.organization_id !== active.id) {
    return <p className="text-muted-foreground">{t("notFound")}</p>;
  }
  const salary = () => {
    if (data.salary_min && data.salary_max) {
      return t("salary", {
        max: formatCurrency(data.salary_max, locale),
        min: formatCurrency(data.salary_min, locale),
      });
    }
    if (data.salary_min) {
      return t("salaryFrom", { min: formatCurrency(data.salary_min, locale) });
    }
    if (data.salary_max) {
      return t("salaryUpTo", { max: formatCurrency(data.salary_max, locale) });
    }
    return null;
  };
  const candidates = [...data.candidates].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const facts = [
    t(`types.${data.employment_type}`),
    data.location,
    salary(),
    t("openings", { count: formatNumber(data.openings, locale) }),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href="/hiring"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("jobs")}
      </Link>
      <div className="grid gap-2">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold text-xl">
          {data.title}
          <Badge variant="outline">{t(`status.job.${data.status}`)}</Badge>
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("number", { number: String(data.number) })} · {facts.join(" · ")}
        </p>
        {data.description ? (
          <p className="whitespace-pre-line text-sm">{data.description}</p>
        ) : null}
      </div>
      {candidates.length === 0 && data.status === "open" ? (
        <p className="text-muted-foreground text-sm">{t("awaiting")}</p>
      ) : null}
      {candidates.map((candidate) => (
        <CandidateCard
          canDecide={canManage && data.status === "open"}
          candidate={candidate}
          jobId={jobId}
          key={candidate.id}
        />
      ))}
      {canManage && data.status === "open" ? (
        <div>
          <Button
            disabled={close.isPending}
            onClick={() => close.mutate()}
            variant="outline"
          >
            {t("close")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

/** /business/hiring/<id>: a job request and its candidates. */
export const HiringJob = ({ jobId }: { jobId: string }) => (
  <BusinessShell>
    <JobDetail jobId={jobId} />
  </BusinessShell>
);
