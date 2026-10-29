import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { DecideAppealForm, ReviewSurveyForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers.surveys");
  return { title: t("title") };
};

const FLAGS = new Set([
  "contact",
  "health",
  "identity",
  "money",
  "politics",
  "religion",
  "reported",
  "sex",
]);

/**
 * Surveys waiting for review: the ones the checker flagged (sensitive
 * topics) and the ones people reported. Approving opens (or reopens) the
 * survey; rejecting closes it and refunds unused rewards.
 */
const SurveysPage = async () => {
  const { canWrite, supabase } = await requireSection("customers");
  const locale = await getLocale();
  const t = await getTranslations("admin.customers.surveys");
  const format = formatters(locale);
  const flagLabel = (flag: string) =>
    FLAGS.has(flag) ? t(`flags.${flag as "reported"}`) : flag;

  const { data } = await supabase
    .from("surveys")
    .select(
      "id, creator_id, title, description, consent, kind, wanted, flags, ethics_reference, opened_at, updated_at, survey_questions (id, position, kind, prompt, options), survey_reports (reason, created_at)"
    )
    .eq("status", "review")
    .order("updated_at")
    .limit(50);
  const surveys = data ?? [];
  const { data: appeals } = await supabase.rpc("survey_appeals");
  const names = await profileNames(
    supabase,
    surveys.flatMap((survey) => survey.creator_id ?? [])
  );

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: t("back") }}
        description={t("description")}
        title={t("title")}
      />
      <PageBody>
        <Panel title={t("review")}>
          {surveys.length === 0 ? <EmptyState title={t("empty")} /> : null}
          {surveys.map((survey) => (
            <article
              className="grid gap-3 rounded-md border p-3"
              key={survey.id}
            >
              <div className="grid gap-1">
                <h3 className="font-semibold">{survey.title}</h3>
                <p className="text-muted-foreground text-sm">
                  <MaybeLink
                    href={
                      survey.creator_id
                        ? `/customers/${survey.creator_id}`
                        : undefined
                    }
                  >
                    {(survey.creator_id && names.get(survey.creator_id)) ||
                      t("unnamed")}
                  </MaybeLink>
                  {" · "}
                  {t(`kinds.${survey.kind as "boosted" | "bulbs" | "free"}`)}
                  {" · "}
                  {t("wanted", { count: format.number(survey.wanted) })}
                  {" · "}
                  {format.date(survey.updated_at)}
                  {survey.opened_at ? ` · ${t("wasOpen")}` : ""}
                </p>
                <p className="flex flex-wrap gap-1">
                  {survey.flags.map((flag) => (
                    <span
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      key={flag}
                    >
                      {flagLabel(flag)}
                    </span>
                  ))}
                </p>
              </div>
              {survey.description ? (
                <p className="whitespace-pre-line text-sm">
                  {survey.description}
                </p>
              ) : null}
              <details>
                <summary className="cursor-pointer text-sm">
                  {t("consent")}
                </summary>
                <p className="whitespace-pre-line pt-2 text-sm">
                  {survey.consent}
                </p>
                {survey.ethics_reference ? (
                  <p className="pt-1 text-muted-foreground text-xs">
                    {t("ethics", { reference: survey.ethics_reference })}
                  </p>
                ) : null}
              </details>
              <ol className="grid list-decimal gap-1 ps-5 text-sm">
                {[...survey.survey_questions]
                  .sort((a, b) => a.position - b.position)
                  .map((question) => (
                    <li key={question.id}>
                      {question.prompt}
                      {question.options.length > 0 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({question.options.join(" / ")})
                        </span>
                      ) : null}
                    </li>
                  ))}
              </ol>
              {survey.survey_reports.length > 0 ? (
                <div className="grid gap-1">
                  <p className="font-medium text-sm">{t("reports")}</p>
                  <ul className="grid gap-1 text-muted-foreground text-sm">
                    {survey.survey_reports.map((report) => (
                      <li key={report.created_at}>
                        {format.date(report.created_at)}: {report.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {canWrite ? <ReviewSurveyForm id={survey.id} /> : null}
            </article>
          ))}
        </Panel>
        <div className="grid" id="appeals">
          <Panel title={t("appeals.title")}>
            <p className="text-muted-foreground text-sm">
              {t("appeals.description")}
            </p>
            {(appeals ?? []).length === 0 ? (
              <EmptyState title={t("appeals.empty")} />
            ) : null}
            {(appeals ?? []).map((appeal) => (
              <article
                className="grid gap-2 border-t pt-3"
                key={appeal.response_id}
              >
                <h3 className="font-semibold">{appeal.title}</h3>
                <p className="text-sm">
                  {appeal.excluded_reason === "too_fast"
                    ? t("appeals.tooFast", {
                        median: format.number(appeal.median_seconds ?? 0),
                        min: format.number(appeal.min_seconds),
                        seconds: format.number(appeal.seconds ?? 0),
                      })
                    : t("appeals.attention", {
                        failed: format.number(appeal.failed_checks),
                      })}
                </p>
                {appeal.note ? (
                  <p className="whitespace-pre-line text-muted-foreground text-sm">
                    {appeal.note}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  {format.date(appeal.appealed_at)}
                </p>
                {canWrite ? <DecideAppealForm id={appeal.response_id} /> : null}
              </article>
            ))}
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default SurveysPage;
