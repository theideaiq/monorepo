import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { PostSections } from "@/components/post-sections";
import { EmptyState, Section } from "@/components/section";
import { getEvents } from "@/lib/data";
import { pagePath } from "@/lib/links";
import { staticPageMetadata } from "@/lib/metadata";
import { eventsPath } from "@/lib/post";

export const revalidate = 300;

interface EventsProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("events", eventsPath);

/** Events, a section of The IDEA Post: upcoming first, then past ones. */
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
      <Section className="flex flex-col gap-8">
        <PostSections current="events" locale={locale} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-xl">{t("upcoming")}</h2>
            <a
              className="text-pink-text text-sm underline"
              href={pagePath(locale, "/pass/events")}
            >
              {t("mine")}
            </a>
          </div>
          {upcoming.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <EventCard event={event} key={event.id} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState>{t("empty")}</EmptyState>
          )}
        </div>
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
