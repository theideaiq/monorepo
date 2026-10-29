"use client";

import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { joinPath, opportunityPath } from "@/lib/club";
import { useFollowOpportunity, useMyFollows } from "@/lib/opportunity-queries";

/** What a followed opportunity is waiting for: opening, its deadline or nothing. */
const followState = (
  opportunity: {
    deadline: string | null;
    opens_at: string | null;
    status: string;
  },
  now: number
) => {
  if (opportunity.status === "closed") {
    return "closed" as const;
  }
  if (opportunity.opens_at && new Date(opportunity.opens_at).getTime() > now) {
    return "opens" as const;
  }
  return opportunity.deadline ? ("closes" as const) : ("open" as const);
};

/** Club → Yours → Following: the opportunities the member follows. */
export const YourFollows = () => {
  const t = useTranslations("web.club.yours.following");
  const kinds = useTranslations("web.opportunities.kinds");
  const locale = useLocale() as Locale;
  const follows = useMyFollows();
  const follow = useFollowOpportunity();

  if (follows.isPending) {
    return <SectionSpinner />;
  }
  if (follows.isError) {
    return <ErrorState onRetry={() => follows.refetch()} />;
  }
  const rows = follows.data.filter((row) => row.opportunity);
  if (rows.length === 0) {
    return (
      <EmptyState>
        {t("none")}{" "}
        <Link
          className="text-pink-text underline"
          href={joinPath("opportunities")}
        >
          {t("browse")}
        </Link>
      </EmptyState>
    );
  }
  const now = Date.now();

  return (
    <ul className="divide-y rounded-lg border">
      {rows.map(({ opportunity, opportunity_id: id }) => {
        if (!opportunity) {
          return null;
        }
        const state = followState(opportunity, now);
        const date =
          state === "opens" ? opportunity.opens_at : opportunity.deadline;
        return (
          <li
            className="flex flex-wrap items-center gap-3 p-3 text-sm"
            key={id}
          >
            <div className="grid min-w-0 flex-1 gap-0.5">
              <Link
                className="font-medium hover:underline"
                href={opportunityPath(opportunity.slug)}
              >
                {locale === "ar" ? opportunity.title_ar : opportunity.title_en}
              </Link>
              <span className="text-muted-foreground text-xs">
                {kinds(opportunity.kind)}
                {" · "}
                {t(`states.${state}`, {
                  date: date ? formatDate(date, locale) : "",
                })}
              </span>
            </div>
            <Button
              disabled={follow.isPending}
              onClick={() =>
                follow.mutate({ follow: false, opportunityId: id })
              }
              size="sm"
              variant="ghost"
            >
              {t("stop")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
