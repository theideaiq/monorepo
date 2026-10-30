"use client";

import { formatPrice, localized } from "@repo/commerce";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { joinPath, opportunityPath } from "@/lib/club";
import { unpaid, useMyApplications } from "@/lib/programs";

/**
 * Club → Yours → Applications: the member's applications to The IDEA's
 * programs, where each stands and the next installment due; each opens
 * the program's page to pay or withdraw.
 */
export const YourApplications = () => {
  const t = useTranslations("web.club.yours.applications");
  const tStatus = useTranslations("web.programs.application.statuses");
  const locale = useLocale();
  const applications = useMyApplications();

  if (applications.isPending) {
    return <SectionSpinner />;
  }
  if (applications.isError) {
    return <ErrorState onRetry={() => applications.refetch()} />;
  }
  const rows = applications.data.filter((row) => row.program?.opportunity);
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

  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row) => {
        const opportunity = row.program?.opportunity;
        if (!opportunity) {
          return null;
        }
        const next =
          row.status === "accepted" || row.status === "confirmed"
            ? unpaid(row)[0]
            : undefined;
        return (
          <li className="grid gap-0.5 p-3 text-sm" key={row.id}>
            <Link
              className="font-medium hover:underline"
              href={opportunityPath(opportunity.slug)}
            >
              {localized(opportunity, "title", locale)}
            </Link>
            <span className="text-muted-foreground text-xs">
              {tStatus(row.status)}
              {next
                ? ` · ${t("nextDue", {
                    amount: formatPrice(next.amount, locale),
                    date: formatDate(next.due_on, locale),
                  })}`
                : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
