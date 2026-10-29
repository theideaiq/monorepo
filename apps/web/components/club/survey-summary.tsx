"use client";

import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { RunBy } from "@/components/club/run-by";
import { useSurveySummary } from "@/lib/survey-queries";

/**
 * The results summary respondents see once a survey closes: how people
 * answered the choice and scale questions, with no count under 5.
 */
export const SurveySummaryPanel = ({
  surveyId,
}: {
  readonly surveyId: string;
}) => {
  const t = useTranslations("web.club.surveys.summary");
  const locale = useLocale() as Locale;
  const summary = useSurveySummary(surveyId);
  const { data } = summary;
  if (!data) {
    return null;
  }
  const number = (value: number | null) =>
    value === null ? t("fewer") : formatNumber(value, locale);

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div className="grid gap-1">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <p className="font-medium">{data.title}</p>
        <RunBy purpose={data.purpose} runBy={data.run_by} />
        <p className="text-muted-foreground text-sm">
          {t("responses", { count: formatNumber(data.responses, locale) })}
        </p>
      </div>
      {data.questions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("tooFew")}</p>
      ) : (
        <ol className="grid gap-4">
          {data.questions.map((question) => (
            <li className="grid gap-2" key={question.id}>
              <p className="font-medium text-sm">{question.prompt}</p>
              <ul className="grid gap-1 text-sm">
                {question.options.map((option) => (
                  <li className="flex justify-between gap-4" key={option.label}>
                    <span>{option.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {number(option.count)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <p className="text-muted-foreground text-xs">{t("note")}</p>
    </section>
  );
};
