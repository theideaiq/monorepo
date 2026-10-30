"use client";

import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RunBy } from "@/components/club/run-by";
import { SurveyExport } from "@/components/club/survey-export";
import { WhoAnswered } from "@/components/club/who-answered";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { orderPath } from "@/lib/order-checkout";
import {
  useCloseSurvey,
  useSurvey,
  useSurveyResults,
} from "@/lib/survey-queries";
import {
  questionSummary,
  type SurveyQuestion,
  type SurveyResult,
  surveyError,
} from "@/lib/surveys";

const surveyHref = (id: string) => `/club/surveys/${encodeURIComponent(id)}`;

/** What the creator can do next, by status. */
const StatusNotice = ({
  survey,
}: {
  readonly survey: {
    id: string;
    order_id: string | null;
    review_note: string | null;
    status: string;
  };
}) => {
  const t = useTranslations("web.club.surveys.manage");
  switch (survey.status) {
    case "draft":
      return (
        <p className="text-sm">
          {t("draft")}{" "}
          <Link
            className="text-pink-text underline"
            href={`/club/surveys/new?edit=${encodeURIComponent(survey.id)}`}
          >
            {t("edit")}
          </Link>
        </p>
      );
    case "review":
      return <p className="text-sm">{t("review")}</p>;
    case "awaiting_payment":
      return survey.order_id ? (
        <p className="text-sm">
          {t("awaitingPayment")}{" "}
          <Link
            className="text-pink-text underline"
            href={orderPath(survey.order_id)}
          >
            {t("pay")}
          </Link>
        </p>
      ) : null;
    case "rejected":
      return (
        <p className="text-destructive text-sm">
          {survey.review_note
            ? t("rejectedWith", { note: survey.review_note })
            : t("rejected")}
        </p>
      );
    case "open":
      return (
        <p className="text-sm">
          {t("open")}{" "}
          <Link
            className="text-pink-text underline"
            href={surveyHref(survey.id)}
          >
            {t("link")}
          </Link>
        </p>
      );
    default:
      return <p className="text-sm">{t("closed")}</p>;
  }
};

/** The answers to one question in short. */
const QuestionSummary = ({
  index,
  question,
  results,
}: {
  readonly index: number;
  readonly question: SurveyQuestion;
  readonly results: readonly SurveyResult[];
}) => {
  const t = useTranslations("web.club.surveys.manage");
  const locale = useLocale() as Locale;
  const summary = questionSummary(question, results);
  return (
    <li className="grid gap-2 rounded-lg border p-4">
      <p className="font-medium">
        {index + 1}. {question.prompt}
      </p>
      <p className="text-muted-foreground text-xs">
        {t("answered", { n: formatNumber(summary.answered, locale) })}
      </p>
      {"options" in summary && summary.options ? (
        <ul className="grid gap-1 text-sm">
          {summary.options.map((row) => (
            <li className="flex justify-between gap-4" key={row.option}>
              <span>{row.option}</span>
              <span className="tabular-nums">
                {formatNumber(row.count, locale)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {"average" in summary && summary.average !== null ? (
        <p className="text-sm">
          {t("average", {
            n: formatNumber(summary.average ?? 0, locale, {
              maximumFractionDigits: 2,
            }),
          })}
        </p>
      ) : null}
    </li>
  );
};

/**
 * /club/surveys/<id>/results: the creator's survey, its status, a summary
 * of the answers and the exports (CSV, Excel, SPSS).
 */
export const SurveyResults = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.manage");
  const tSurveys = useTranslations("web.club.surveys");
  const tError = useTranslations("web.club.surveys.errors");
  const locale = useLocale() as Locale;
  const survey = useSurvey(surveyId);
  const live = Boolean(
    survey.data &&
      !["draft", "review", "awaiting_payment", "rejected"].includes(
        survey.data.status
      )
  );
  const results = useSurveyResults(surveyId, live);
  const close = useCloseSurvey();

  if (survey.isPending) {
    return <SectionSpinner />;
  }
  if (survey.isError) {
    return <ErrorState onRetry={() => survey.refetch()} />;
  }
  const { data } = survey;
  if (!data) {
    return <p className="text-muted-foreground">{t("notFound")}</p>;
  }
  const questions = data.survey_questions;
  const rows = results.data ?? [];
  const counted = rows.filter((row) => row.counted).length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
        href="/club#yours"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
        {tSurveys("back")}
      </Link>
      <PageHeader title={data.title} />
      <RunBy purpose={data.purpose} runBy={data.run_by} />
      <StatusNotice survey={data} />
      {data.status === "open" ? (
        <div className="grid gap-2">
          <Button
            className="justify-self-start"
            disabled={close.isPending}
            onClick={() =>
              close.mutate(surveyId, { onSuccess: () => survey.refetch() })
            }
            variant="outline"
          >
            {t("close")}
          </Button>
          {close.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {tError(surveyError(close.error.message))}
            </p>
          ) : null}
        </div>
      ) : null}

      {live ? (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <dt className="text-muted-foreground text-xs">{t("counted")}</dt>
              <dd className="font-semibold text-xl tabular-nums">
                {t("ofWanted", {
                  n: formatNumber(counted, locale),
                  wanted: formatNumber(data.wanted, locale),
                })}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-muted-foreground text-xs">{t("all")}</dt>
              <dd className="font-semibold text-xl tabular-nums">
                {formatNumber(rows.length, locale)}
              </dd>
            </div>
            {data.opened_at ? (
              <div className="rounded-lg border p-4">
                <dt className="text-muted-foreground text-xs">{t("opened")}</dt>
                <dd className="font-semibold">
                  {formatDate(data.opened_at, locale)}
                </dd>
              </div>
            ) : null}
          </dl>
          <WhoAnswered surveyId={surveyId} />
          <SurveyExport questions={questions} rows={rows} survey={data} />
          {results.isPending ? <SectionSpinner /> : null}
          {results.isError ? (
            <ErrorState onRetry={() => results.refetch()} />
          ) : null}
          {results.isSuccess ? (
            <ol
              className="grid gap-3"
              dir={data.language === "ar" ? "rtl" : "ltr"}
              lang={data.language}
            >
              {questions.map((question, index) => (
                <QuestionSummary
                  index={index}
                  key={question.id}
                  question={question}
                  results={rows.filter((row) => row.counted)}
                />
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
