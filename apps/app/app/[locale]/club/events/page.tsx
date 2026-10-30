import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import { EventCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { joinPath } from "@/lib/club";
import { getEvents } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

interface EventsProps {
  params: Promise<{ locale: Locale }>;
}

export const revalidate = 60;

export const generateMetadata = async ({
  params,
}: EventsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.events.meta" });
  return localizedMetadata(locale, joinPath("events"), {
    description: t("description"),
    title: t("title"),
  });
};

/** `/club/events`: upcoming events, soonest first, then past ones. */
const EventsPage = async ({ params }: EventsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, upcoming, past] = await Promise.all([
    getTranslations({ locale, namespace: "web" }),
    getEvents({ limit: 48 }),
    getEvents({ limit: 12, past: true }),
  ]);
  return (
    <>
      <PageHero subtitle={t("events.description")} title={t("events.title")} />
      <Section className="flex flex-col gap-10">
        <ClubNav current="events" locale={locale} />
        {upcoming.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("club.join.empty.events")}</EmptyState>
        )}
        {past.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-semibold text-xl">{t("club.pastEvents")}</h2>
            <div className="grid gap-6 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard event={event} key={event.id} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}
      </Section>
    </>
  );
};

export default EventsPage;
