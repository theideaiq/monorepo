"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useProfile } from "@/lib/queries";
import { useMySurveyRecord } from "@/lib/survey-queries";

/**
 * /club/surveys/certificate: the participation certificate, saved as a
 * PDF from the browser's print dialog. It lists the surveys whose answers
 * counted (titles, who ran them, dates and the count), never the answers.
 */
export const SurveyCertificate = () => {
  const t = useTranslations("web.club.surveys.certificate");
  const tSurveys = useTranslations("web.club.surveys");
  const locale = useLocale() as Locale;
  const record = useMySurveyRecord();
  const profile = useProfile();
  if (record.isPending || profile.isPending) {
    return <SectionSpinner />;
  }
  if (record.isError || profile.isError) {
    return (
      <ErrorState
        onRetry={() => Promise.all([record.refetch(), profile.refetch()])}
      />
    );
  }
  const counted = record.data.surveys.filter((survey) => survey.counted);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href="/club#yours"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
          {tSurveys("back")}
        </Link>
        <Button className="gap-2" onClick={() => window.print()}>
          <PrinterIcon aria-hidden="true" className="size-4" />
          {t("save")}
        </Button>
      </div>
      <article className="grid gap-6 rounded-lg border p-6 md:p-10 print:border-0 print:p-0">
        <header className="grid gap-4 border-b pb-6">
          <BrandLogo />
          <h1 className="font-semibold text-2xl">{t("title")}</h1>
          <p>
            {t("body", {
              count: formatNumber(counted.length, locale),
              name: profile.data?.full_name ?? "",
            })}
          </p>
        </header>
        {counted.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 text-start font-medium">{t("survey")}</th>
                <th className="py-2 text-start font-medium">{t("runBy")}</th>
                <th className="py-2 text-start font-medium">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {counted.map((survey) => (
                <tr className="border-b" key={survey.survey_id}>
                  <td className="py-2 pe-4">{survey.title}</td>
                  <td className="py-2 pe-4">{survey.run_by ?? ""}</td>
                  <td className="py-2">
                    {formatDate(survey.submitted_at, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer className="grid gap-2 text-muted-foreground text-xs">
          <p>
            {t("issued", {
              date: formatDate(new Date().toISOString(), locale),
            })}
          </p>
          <p>{t("terms")}</p>
        </footer>
      </article>
    </div>
  );
};
