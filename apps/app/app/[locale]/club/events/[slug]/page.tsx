import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EventArticle } from "@/components/club/event-article";
import { eventPath } from "@/lib/club";
import { editorialUrl, getEvent, getEvents } from "@/lib/data";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 60;

interface EventProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

// The next events are built ahead; others on demand.
export const generateStaticParams = async () =>
  (await getEvents({ limit: 100 })).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: EventProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const event = await getEvent(slug);
  if (!event) {
    return {};
  }
  return localizedMetadata(locale, eventPath(slug), {
    description: markdownToText(localized(event, "description", locale), 160),
    image: editorialUrl(event.cover_image),
    title: localized(event, "title", locale),
  });
};

/** `/club/events/<slug>`: an event, its date and place, and the RSVP. */
const EventPage = async ({ params }: EventProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const event = await getEvent(slug);
  if (!event) {
    notFound();
  }
  return <EventArticle event={event} locale={locale} />;
};

export default EventPage;
