"use client";

import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useSurveyAudience } from "@/lib/survey-queries";
import { QUOTA_FIELDS, type QuotaField, surveyMinutes } from "@/lib/surveys";

/**
 * "Who answered", on the results page: how many started, finished and
 * were excluded, the median time, the respondents by targeting field
 * against the target (groups under 5 are never shown) and the fixed note
 * that they aren't a random sample.
 */
export const WhoAnswered = ({ surveyId }: { readonly surveyId: string }) => {
  const t = useTranslations("web.club.surveys.manage.audience");
  const locale = useLocale() as Locale;
  const audience = useSurveyAudience(surveyId, true);
  const { data } = audience;
  if (!data) {
    return null;
  }
  const number = (value: number) => formatNumber(value, locale);
  const label = (field: QuotaField, value: string) => {
    if (value === "other") {
      return t("other");
    }
    if (value === "unknown") {
      return t("unknown");
    }
    return field === "year" ? t("year", { n: value }) : value;
  };

  return (
    <section className="grid gap-3 rounded-lg border p-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      <p className="text-sm">
        {t("counts", {
          counted: number(data.counted),
          excluded: number(data.excluded),
          finished: number(data.finished),
          started: number(data.started),
          wanted: number(data.wanted),
        })}
        {data.median_seconds
          ? ` ${t("median", { minutes: number(surveyMinutes(data.median_seconds)) })}`
          : null}
      </p>
      {QUOTA_FIELDS.map((field) => {
        const rows = data.breakdown[field] ?? [];
        if (rows.length === 0) {
          return null;
        }
        const quota = data.quotas[field];
        return (
          <div className="grid gap-1" key={field}>
            <h3 className="font-medium text-sm">
              {t(`fields.${field}`)}
              {quota ? ` · ${t("quota", { share: number(quota) })}` : null}
            </h3>
            <ul className="grid gap-0.5 text-muted-foreground text-sm">
              {rows.map((row) => (
                <li className="flex justify-between gap-4" key={row.value}>
                  <span dir="auto">{label(field, row.value)}</span>
                  <span className="tabular-nums">{number(row.count)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs">{t("smallGroups")}</p>
      <p className="text-muted-foreground text-xs">{t("note")}</p>
    </section>
  );
};
