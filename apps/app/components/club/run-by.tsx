"use client";

import { useTranslations } from "next-intl";
import type { SurveyPurpose } from "@/lib/surveys";

/** Who runs a survey and why, always shown on it ("Academic research · AUIB"). */
export const RunBy = ({
  purpose,
  runBy,
}: {
  readonly purpose: string | null;
  readonly runBy: string | null;
}) => {
  const t = useTranslations("web.club.surveys.runBy");
  if (!runBy) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-sm">
      {purpose
        ? t("withPurpose", {
            purpose: t(`purposes.${purpose as SurveyPurpose}`),
            runBy,
          })
        : t("only", { runBy })}
    </p>
  );
};
