"use client";

import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  intlLocale,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ChevronRightIcon, FolderIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { countryName } from "@/lib/club";
import { calendarDay, kitPath, travelPath } from "@/lib/travel-kit";
import { useMyKits } from "@/lib/travel-queries";

/** `/pass/travel`: the member's Travel Kits, one folder per trip. */
export const Kits = () => {
  const t = useTranslations("app.travel.kits");
  const locale = useLocale() as Locale;
  const kits = useMyKits();

  let body = <SectionSpinner />;
  if (kits.isError) {
    body = <ErrorState onRetry={() => kits.refetch()} />;
  } else if (kits.data && kits.data.length === 0) {
    body = (
      <EmptyState action={{ href: travelPath, label: t("findDestination") }}>
        {t("empty")}
      </EmptyState>
    );
  } else if (kits.data) {
    body = (
      <ul className="grid gap-3">
        {kits.data.map((kit) => {
          const program = kit.opportunity
            ? localized(kit.opportunity, "title", locale)
            : null;
          const country = kit.route
            ? countryName(kit.route.country, intlLocale(locale))
            : null;
          return (
            <li key={kit.id}>
              <Link
                className="flex min-h-16 items-center gap-3 rounded-lg border bg-surface-raised p-4 shadow-1 transition-shadow hover:shadow-2"
                href={kitPath(kit.id)}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-idea-pink text-on-pink">
                  <FolderIcon aria-hidden="true" className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-medium">
                    {kit.route
                      ? t("route", {
                          country: country ?? "",
                          visa: localized(kit.route, "visa", locale),
                        })
                      : t("routeGone")}
                  </span>
                  {program ? (
                    <span className="truncate text-muted-foreground text-sm">
                      {program}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    {kit.departure_on
                      ? t("departs", {
                          date: formatCalendarDate(
                            calendarDay(kit.departure_on),
                            locale
                          ),
                        })
                      : t("noDates")}
                  </span>
                </span>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <PageHeader title={t("title")}>
        <Button asChild size="sm" variant="outline">
          <Link href={travelPath}>{t("findDestination")}</Link>
        </Button>
      </PageHeader>
      <div className="flex max-w-3xl flex-1 flex-col gap-4">
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
        {body}
      </div>
    </>
  );
};
