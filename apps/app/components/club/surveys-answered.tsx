"use client";

import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { AwardIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useMySurveyRecord } from "@/lib/survey-queries";

/**
 * Club → Yours → Surveys: the surveys the member answered (each with its
 * summary once it closes), the contributor badge and the participation
 * certificate.
 */
export const SurveysAnswered = () => {
  const t = useTranslations("web.club.surveys.answered");
  const locale = useLocale() as Locale;
  const record = useMySurveyRecord();
  if (record.isPending) {
    return <SectionSpinner />;
  }
  if (record.isError) {
    return <ErrorState onRetry={() => record.refetch()} />;
  }
  const { data } = record;
  const number = (value: number) => formatNumber(value, locale);

  return (
    <section className="grid gap-3">
      <h3 className="font-semibold">{t("title")}</h3>
      <p className="flex items-center gap-2 text-sm">
        <AwardIcon aria-hidden="true" className="size-4 text-pink-text" />
        {data.level > 0
          ? t("badge", { level: number(data.level) })
          : t("noBadge")}{" "}
        {data.next
          ? t("next", {
              counted: number(data.counted),
              next: number(data.next),
            })
          : null}
      </p>
      {data.surveys.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <ul className="grid gap-2">
          {data.surveys.map((survey) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border p-3 text-sm"
              key={survey.survey_id}
            >
              <span className="font-medium">{survey.title}</span>
              <span className="text-muted-foreground text-xs">
                {formatDate(survey.submitted_at, locale)} ·{" "}
                {survey.counted ? t("counted") : t("notCounted")}
                {survey.summary ? (
                  <>
                    {" · "}
                    <Link
                      className="text-pink-text underline"
                      href={`/club/surveys/${encodeURIComponent(survey.survey_id)}`}
                    >
                      {t("summary")}
                    </Link>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.counted > 0 ? (
        <Link
          className="justify-self-start text-pink-text text-sm underline"
          href="/club/surveys/certificate"
        >
          {t("certificate")}
        </Link>
      ) : null}
    </section>
  );
};
