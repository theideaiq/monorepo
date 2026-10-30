"use client";

import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { DownloadIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSurveyAudience } from "@/lib/survey-queries";
import {
  answersDeleteOn,
  audienceRows,
  downloadText,
  resultRows,
  type SurveyQuestion,
  type SurveyResult,
  toCsv,
  toExcel,
  toSpssSyntax,
} from "@/lib/surveys";

/**
 * The creator's exports: the responses (CSV, Excel, SPSS) and "Who
 * answered" (its own CSV, and a second sheet in Excel), for the stated
 * purpose only, and when the raw answers will be deleted.
 */
export const SurveyExport = ({
  survey,
  questions,
  rows,
}: {
  readonly questions: readonly SurveyQuestion[];
  readonly rows: readonly SurveyResult[];
  readonly survey: {
    answers_deleted_at: string | null;
    closed_at: string | null;
    id: string;
    keep_months: number;
  };
}) => {
  const t = useTranslations("web.club.surveys.manage");
  const tAudience = useTranslations("web.club.surveys.manage.audience");
  const locale = useLocale() as Locale;
  const audience = useSurveyAudience(survey.id, true);
  const audienceSheet = () =>
    audience.data
      ? audienceRows(audience.data, {
          field: (field) => tAudience(`fields.${field}`),
          note: tAudience("note"),
          stats: {
            counted: tAudience("export.counted"),
            excluded: tAudience("export.excluded"),
            finished: tAudience("export.finished"),
            median: tAudience("export.median"),
            started: tAudience("export.started"),
            wanted: tAudience("export.wanted"),
          },
        })
      : [];
  const none = rows.length === 0;

  let retention: string | null = null;
  if (survey.answers_deleted_at) {
    retention = t("retention.deleted", {
      date: formatDate(survey.answers_deleted_at, locale),
    });
  } else if (survey.closed_at) {
    retention = t("retention.on", {
      date: formatDate(
        answersDeleteOn(survey.closed_at, survey.keep_months).toISOString(),
        locale
      ),
    });
  } else {
    retention = t("retention.after", {
      months: String(survey.keep_months),
    });
  }

  return (
    <div className="grid gap-2">
      <h2 className="font-semibold text-lg">{t("export")}</h2>
      <p className="text-muted-foreground text-sm">{t("exportNote")}</p>
      <p className="text-muted-foreground text-sm">{t("exportPurpose")}</p>
      <p className="text-muted-foreground text-sm">{retention}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="gap-2"
          disabled={none}
          onClick={() =>
            downloadText(
              "responses.csv",
              "text/csv;charset=utf-8",
              toCsv(resultRows(questions, rows))
            )
          }
          variant="outline"
        >
          <DownloadIcon aria-hidden="true" className="size-4" />
          {t("csv")}
        </Button>
        <Button
          className="gap-2"
          disabled={none}
          onClick={() =>
            downloadText(
              "responses.xls",
              "application/vnd.ms-excel",
              toExcel(resultRows(questions, rows), [
                { name: "Who answered", rows: audienceSheet() },
              ])
            )
          }
          variant="outline"
        >
          <DownloadIcon aria-hidden="true" className="size-4" />
          {t("excel")}
        </Button>
        <Button
          className="gap-2"
          disabled={none}
          onClick={() =>
            downloadText(
              "responses.sps",
              "text/plain;charset=utf-8",
              toSpssSyntax(questions)
            )
          }
          variant="outline"
        >
          <DownloadIcon aria-hidden="true" className="size-4" />
          {t("spss")}
        </Button>
        <Button
          className="gap-2"
          disabled={!audience.data}
          onClick={() =>
            downloadText(
              "who-answered.csv",
              "text/csv;charset=utf-8",
              toCsv(audienceSheet())
            )
          }
          variant="outline"
        >
          <DownloadIcon aria-hidden="true" className="size-4" />
          {t("audienceCsv")}
        </Button>
      </div>
    </div>
  );
};
