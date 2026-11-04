"use client";

import type { Enums } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { formatCalendarDate } from "@repo/internationalization/format";
import {
  BadgeCheckIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  InfoIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { sourceHost } from "@/lib/club";
import { calendarDay } from "@/lib/travel-kit";

const CONFIDENCE_ICONS = {
  official: BadgeCheckIcon,
  secondary: InfoIcon,
  unconfirmed: CircleHelpIcon,
} as const;

const CONFIDENCE_VARIANTS = {
  official: "success",
  secondary: "neutral",
  unconfirmed: "warning",
} as const;

/**
 * How sure a requirement is (Official, Other source, Not confirmed), where
 * it came from and the day it was checked; every line shows all three.
 */
export const RequirementFacts = ({
  checkedOn,
  confidence,
  sourceUrl,
}: {
  readonly checkedOn: string;
  readonly confidence: Enums<"travel_confidence">;
  readonly sourceUrl: string;
}) => {
  const t = useTranslations("app.travel.facts");
  const locale = useLocale() as Locale;
  const Icon = CONFIDENCE_ICONS[confidence];
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <Badge variant={CONFIDENCE_VARIANTS[confidence]}>
        <Icon aria-hidden="true" />
        {t(`confidence.${confidence}`)}
      </Badge>
      <a
        className="inline-flex min-h-6 items-center gap-1 underline"
        href={sourceUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="sr-only">{t("source")}</span>
        <span dir="ltr">{sourceHost(sourceUrl)}</span>
        <ExternalLinkIcon aria-hidden="true" className="size-3" />
      </a>
      <span>
        {t("checked", {
          date: formatCalendarDate(calendarDay(checkedOn), locale),
        })}
      </span>
    </p>
  );
};
