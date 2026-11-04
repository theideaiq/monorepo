import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  intlLocale,
} from "@repo/internationalization/format";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { StartKitButton } from "@/components/travel/start-kit-button";
import { countryName } from "@/lib/club";
import { getTravelRoutes, type TravelRouteRow } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { calendarDay, travelPath } from "@/lib/travel-kit";

export const revalidate = 300;

interface TravelProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: TravelProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.travel" });
  return localizedMetadata(locale, travelPath, {
    description: t("description"),
    title: t("title"),
  });
};

/** Routes grouped by country, countries in the page's alphabet. */
const byCountry = (routes: readonly TravelRouteRow[], locale: Locale) => {
  const groups = new Map<string, TravelRouteRow[]>();
  for (const route of routes) {
    groups.set(route.country, [...(groups.get(route.country) ?? []), route]);
  }
  const collator = new Intl.Collator(intlLocale(locale));
  return [...groups.entries()]
    .map(([code, list]) => ({
      code,
      name: countryName(code, intlLocale(locale)),
      routes: list,
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
};

/**
 * `/club/travel`: the Travel Kit's destinations, each a country and visa
 * type checked by The IDEA's editors; a member starts a kit from any.
 */
const TravelPage = async ({ params }: TravelProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, routes] = await Promise.all([
    getTranslations({ locale, namespace: "web.travel" }),
    getTravelRoutes(),
  ]);
  const countries = byCountry(routes, locale);

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section className="flex flex-col gap-8">
        <ClubNav current="travel" locale={locale} />
        <ul className="grid gap-2 text-muted-foreground text-sm">
          <li>{t("points.documents")}</li>
          <li>{t("points.schedule")}</li>
          <li>{t("points.noScans")}</li>
        </ul>
        {countries.length > 0 ? (
          <div className="flex flex-col gap-8">
            {countries.map((country) => (
              <section
                aria-labelledby={`country-${country.code}`}
                className="flex flex-col gap-3"
                key={country.code}
              >
                <h2
                  className="font-semibold text-xl"
                  id={`country-${country.code}`}
                >
                  {country.name}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {country.routes.map((route) => {
                    const note = localized(route, "note", locale);
                    return (
                      <li
                        className="flex flex-col gap-3 rounded-lg border bg-surface-raised p-5 shadow-1"
                        key={route.id}
                      >
                        <h3 className="font-medium">
                          {localized(route, "visa", locale)}
                        </h3>
                        {note ? (
                          <p className="text-muted-foreground text-sm">
                            {note}
                          </p>
                        ) : null}
                        {route.checked_on ? (
                          <p className="text-muted-foreground text-xs">
                            {t("checked", {
                              date: formatCalendarDate(
                                calendarDay(route.checked_on),
                                locale
                              ),
                            })}
                          </p>
                        ) : null}
                        <div className="mt-auto">
                          <StartKitButton
                            className="w-full"
                            routeId={route.id}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState>{t("empty")}</EmptyState>
        )}
      </Section>
    </>
  );
};

export default TravelPage;
