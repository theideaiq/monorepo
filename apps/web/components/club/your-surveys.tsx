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
import { receiptPath, surveyPath } from "@/lib/club";
import { useMyStudent } from "@/lib/student-queries";
import { useMySurveys, useSurveyCredits } from "@/lib/survey-queries";

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
        <li
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          key={survey.id}
        >
          <Link
            className="font-medium hover:underline"
            href={`${surveyPath(survey.id)}/results`}
            lang={survey.language}
          >
            {survey.title}
          </Link>
          <span className="flex items-center gap-2 text-muted-foreground text-xs">
            {t("responses", {
              n: formatNumber(survey.survey_responses[0]?.count ?? 0, locale),
            })}
            <Badge variant="outline">
              {t(`status.${survey.status as "open"}`)}
            </Badge>
            {survey.order_id ? (
              <Link
                className="text-pink-text underline"
                href={receiptPath(survey.order_id)}
              >
                {t("receipt")}
              </Link>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
};

/**
 * Club → Yours → Surveys: the member's response credits and, for verified
 * students, their own surveys (surveys to answer are in Join).
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
