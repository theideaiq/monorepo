import { getCandidateCvUrl } from "@repo/storage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CandidateForm } from "../../_components/candidate-form";
import { candidateTone, jobTone } from "../../_components/tones";
import { closeJob, withdrawCandidate } from "../../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.suite.hiring");
  return { title: t("title") };
};

/** A company's job request: its details, the candidates and a new one. */
const SuiteJobPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const { supabase } = await requireSection("suite");
  const t = await getTranslations("admin.suite.hiring");
  const tApp = await getTranslations("app.suite.hiring");
  const format = formatters(await getLocale());

  const { data: job } = await supabase
    .from("job_requests")
    .select("*, organizations (name), candidates (*)")
    .eq("id", id)
    .maybeSingle();
  if (!job) {
    notFound();
  }
  const candidates = [...job.candidates].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const cvLinks = new Map(
    await Promise.all(
      candidates
        .filter((candidate) => candidate.cv_path)
        .map(
          async (candidate) =>
            [
              candidate.id,
              await getCandidateCvUrl(supabase, candidate.cv_path ?? "").catch(
                () => null
              ),
            ] as const
        )
    )
  );
  const salary = [job.salary_min, job.salary_max]
    .map((value) => (value ? format.money(value) : "—"))
    .join(" – ");

  return (
    <>
      <PageHeader
        back={{ href: "/suite/hiring", label: t("title") }}
        title={`${t("number", { number: String(job.number) })} · ${job.title}`}
      >
        <StatusBadge tone={jobTone[job.status]}>
          {tApp(`status.job.${job.status}`)}
        </StatusBadge>
      </PageHeader>
      <PageBody className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          {candidates.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noCandidates")}</p>
          ) : null}
          {candidates.map((candidate) => (
            <Panel
              actions={
                <StatusBadge tone={candidateTone[candidate.status]}>
                  {tApp(`status.candidate.${candidate.status}`)}
                </StatusBadge>
              }
              key={candidate.id}
              title={candidate.full_name}
            >
              <div className="grid gap-3 text-sm">
                {candidate.headline ? (
                  <p className="text-muted-foreground">{candidate.headline}</p>
                ) : null}
                {candidate.summary ? (
                  <p className="whitespace-pre-line">{candidate.summary}</p>
                ) : null}
                {cvLinks.get(candidate.id) ? (
                  <a
                    className="w-fit underline"
                    href={cvLinks.get(candidate.id) ?? undefined}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("openCv")}
                  </a>
                ) : null}
                {candidate.company_note ? (
                  <p className="text-muted-foreground">
                    {t("companyNote", { note: candidate.company_note })}
                  </p>
                ) : null}
                {candidate.status === "proposed" ? (
                  <ActionButton
                    action={withdrawCandidate}
                    className="w-fit"
                    confirm={{ title: t("withdraw") }}
                    fields={{ candidateId: candidate.id }}
                    size="sm"
                    variant="ghost"
                  >
                    {t("withdraw")}
                  </ActionButton>
                ) : null}
              </div>
            </Panel>
          ))}
          {job.status === "open" ? (
            <Panel title={t("propose")}>
              <CandidateForm
                jobId={job.id}
                organizationId={job.organization_id}
              />
            </Panel>
          ) : null}
        </div>
        <Panel title={t("details")}>
          <DetailList
            items={[
              { label: t("company"), value: job.organizations?.name ?? "—" },
              {
                label: t("type"),
                value: tApp(`types.${job.employment_type}`),
              },
              { label: t("location"), value: job.location ?? "—" },
              { label: t("salary"), value: salary },
              { label: t("openings"), value: format.number(job.openings) },
              { label: t("posted"), value: format.dateTime(job.created_at) },
            ]}
          />
          {job.description ? (
            <p className="mt-4 whitespace-pre-line text-sm">
              {job.description}
            </p>
          ) : null}
          {job.status === "open" ? (
            <ActionButton
              action={closeJob}
              className="mt-4"
              confirm={{ title: t("close") }}
              fields={{ jobId: job.id }}
              variant="ghost"
            >
              {t("close")}
            </ActionButton>
          ) : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default SuiteJobPage;
