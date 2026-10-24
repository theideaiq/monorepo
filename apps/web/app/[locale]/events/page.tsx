import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { getEvents } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface EventsProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("events", "/events");

const Events = async ({ params }: EventsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.events" });
  const [upcoming, past] = await Promise.all([
    getEvents({ limit: 48 }),
    getEvents({ limit: 12, past: true }),
  ]);

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section title={t("upcoming")}>
        {upcoming.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("empty")}</EmptyState>
        )}
      </Section>
      {past.length > 0 ? (
        <Section title={t("past")}>
          <div className="grid gap-6 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
};

export default Events;
