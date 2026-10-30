"use client";

import { useAuth } from "@repo/auth/provider";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { byDateOrDeadline, type JoinFilter, surveyPath } from "@/lib/club";
import { useMySurveyAccess, useSurveysForMe } from "@/lib/survey-queries";

/**
 * What decides which Boosted surveys the member sees: a phone of their own
 * (once phones are required), today's limit, and being a trusted
 * respondent (new ones a day early).
 */
const SurveyAccessNote = () => {
  const t = useTranslations("web.club.join.access");
  const locale = useLocale() as Locale;
  const access = useMySurveyAccess().data;
  if (!access) {
    return null;
  }
  if (access.phone_required && !access.own_phone) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("phone")}{" "}
        <Link className="text-pink-text underline" href="/pass/settings/phone">
          {t("verify")}
        </Link>
      </p>
    );
  }
  if (access.boosted_today >= access.daily_limit) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("limit", { n: formatNumber(access.daily_limit, locale) })}
      </p>
    );
  }
  return access.trusted ? (
    <p className="text-muted-foreground text-sm">{t("trusted")}</p>
  ) : null;
};

/**
 * An event or opportunity card drawn on the server, with when it starts or
 * its deadline (null: open-ended). Featured opportunities come first.
 */
export interface JoinEvent {
  at: string | null;
  card: ReactNode;
  featured?: boolean;
  key: string;
}

interface SurveyItem {
  closes_at: string | null;
  id: string;
  language: string;
  reward: number;
  title: string;
}

/** A survey the member can answer: its reward and deadline. */
const SurveyCard = ({ survey }: { readonly survey: SurveyItem }) => {
  const t = useTranslations("web.club.join");
  const locale = useLocale() as Locale;
  return (
    <Link
      className="group flex w-full flex-col gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
      href={surveyPath(survey.id)}
    >
      <p className="flex items-center gap-2 font-medium text-pink-text text-xs">
        <ClipboardList aria-hidden="true" className="size-4" />
        {t("survey")}
      </p>
      <h3
        className="font-semibold text-lg leading-snug group-hover:text-pink-text"
        lang={survey.language}
      >
        {survey.title}
      </h3>
      <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
        <Badge variant="secondary">
          {survey.reward > 0
            ? t("reward", { bulbs: formatNumber(survey.reward, locale) })
            : t("giveToGet")}
        </Badge>
        {survey.closes_at ? (
          <time dateTime={survey.closes_at}>
            {t("closes", { date: formatDate(survey.closes_at, locale) })}
          </time>
        ) : null}
      </p>
    </Link>
  );
};

/** Signed out, surveys need a Pass: say so where they would be. */
const SignInForSurveys = () => {
  const t = useTranslations("web.club.join");
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{t("signInForSurveys")}</p>
      <Button asChild size="sm" variant="outline">
        <Link
          href={{ pathname: "/sign-in", query: { return_to: "/club/surveys" } }}
        >
          {t("signIn")}
        </Link>
      </Button>
    </div>
  );
};

/** The surveys open to the member (none until they sign in). */
const useJoinSurveys = (wanted: boolean) => {
  const { loading, user } = useAuth();
  const surveys = useSurveysForMe();
  const active = wanted && Boolean(user);
  return {
    error: active && surveys.isError,
    list: active ? (surveys.data ?? []) : [],
    pending: wanted && (loading || (active && surveys.isPending)),
    retry: () => surveys.refetch(),
    signedOut: wanted && !loading && !user,
  };
};

/**
 * Club → Join: events, opportunities and surveys in one list, featured
 * opportunities first, then soonest date or deadline, or one kind with
 * `filter`.
 */
export const JoinFeed = ({
  events,
  filter,
}: {
  readonly events: readonly JoinEvent[];
  readonly filter?: JoinFilter;
}) => {
  const t = useTranslations("web.club.join");
  const withSurveys = !filter || filter === "surveys";
  const surveys = useJoinSurveys(withSurveys);
  const items = byDateOrDeadline<JoinEvent>([
    ...(filter === "surveys" ? [] : events),
    ...surveys.list.map((survey) => ({
      at: survey.closes_at,
      card: <SurveyCard survey={survey} />,
      key: `survey-${survey.id}`,
    })),
  ]).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  return (
    <div className="flex flex-col gap-4">
      {withSurveys && !surveys.signedOut ? <SurveyAccessNote /> : null}
      {items.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li className="flex" key={item.key}>
              {item.card}
            </li>
          ))}
        </ul>
      ) : null}
      {surveys.pending ? <SectionSpinner /> : null}
      {surveys.error ? <ErrorState onRetry={surveys.retry} /> : null}
      {items.length === 0 && !surveys.pending && !surveys.signedOut ? (
        <EmptyState>{t(filter ? `empty.${filter}` : "empty.all")}</EmptyState>
      ) : null}
      {surveys.signedOut ? <SignInForSurveys /> : null}
    </div>
  );
};
