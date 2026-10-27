"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useMyStudent } from "@/lib/student-queries";
import {
  useMySurveys,
  useSurveyCredits,
  useSurveysForMe,
} from "@/lib/survey-queries";

const surveyHref = (id: string) => `/club/surveys/${encodeURIComponent(id)}`;

/** Open surveys the member can answer. */
const ToAnswer = () => {
  const t = useTranslations("web.club.surveys.yours");
  const surveys = useSurveysForMe();
  if (surveys.isPending) {
    return <SectionSpinner />;
  }
  if (surveys.isError) {
    return <ErrorState onRetry={() => surveys.refetch()} />;
  }
  if (surveys.data.length === 0) {
    return <EmptyState>{t("noneToAnswer")}</EmptyState>;
  }
  return (
    <ul className="grid gap-2">
      {surveys.data.map((survey) => (
        <li key={survey.id}>
          <Link
            className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted"
            href={surveyHref(survey.id)}
          >
            <span className="font-medium" lang={survey.language}>
              {survey.title}
            </span>
            <Badge variant="secondary">
              {survey.reward > 0
                ? t("reward", { bulbs: String(survey.reward) })
                : t("giveToGet")}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** The member's own surveys, with their status and responses. */
const Created = () => {
  const t = useTranslations("web.club.surveys.yours");
  const locale = useLocale() as Locale;
  const surveys = useMySurveys();
  if (surveys.isPending) {
    return <SectionSpinner />;
  }
  if (surveys.isError) {
    return <ErrorState onRetry={() => surveys.refetch()} />;
  }
  if (!surveys.data || surveys.data.length === 0) {
    return <EmptyState>{t("noneCreated")}</EmptyState>;
  }
  return (
    <ul className="grid gap-2">
      {surveys.data.map((survey) => (
        <li key={survey.id}>
          <Link
            className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted"
            href={`${surveyHref(survey.id)}/results`}
          >
            <span className="font-medium" lang={survey.language}>
              {survey.title}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground text-xs">
              {t("responses", {
                n: formatNumber(survey.survey_responses[0]?.count ?? 0, locale),
              })}
              <Badge variant="outline">
                {t(`status.${survey.status as "open"}`)}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/**
 * Club → Yours → Surveys: the ones to answer, the member's response
 * credits and, for verified students, their own surveys.
 */
export const YourSurveys = () => {
  const t = useTranslations("web.club.surveys");
  const locale = useLocale() as Locale;
  const credits = useSurveyCredits();
  const student = useMyStudent();
  const verified = Boolean(student.data?.verified);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <h3 className="font-semibold">{t("yours.toAnswer")}</h3>
        <ToAnswer />
      </div>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("yours.created")}</h3>
          {verified ? (
            <Button asChild className="gap-2" size="sm">
              <Link href="/club/surveys/new">
                <PlusIcon aria-hidden="true" className="size-4" />
                {t("yours.new")}
              </Link>
            </Button>
          ) : null}
        </div>
        {credits.isSuccess ? (
          <p className="text-muted-foreground text-sm">
            {t("yours.credits", { n: formatNumber(credits.data, locale) })}
          </p>
        ) : null}
        {verified ? (
          <Created />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("studentsCreate")}{" "}
            <Link
              className="text-pink-text underline"
              href="/pass/settings#student"
            >
              {t("verify")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
