import { localized } from "@repo/commerce";
import { project } from "@repo/config";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
  formatTime,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { CalendarDays, MapPin, MoveLeft, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { env } from "@/env";
import { editorialUrl, getEvent, getEvents, getRsvpCount } from "@/lib/data";
import { appLink } from "@/lib/links";
import { Markdown, markdownToText } from "@/lib/markdown";
import { localizedMetadata, siteUrl } from "@/lib/metadata";

// The RSVP count changes often; refresh the page every minute.
export const revalidate = 60;

interface EventProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

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
  return localizedMetadata(locale, `/events/${slug}`, {
    description: markdownToText(localized(event, "description", locale), 160),
    image: editorialUrl(event.cover_image),
    title: localized(event, "title", locale),
  });
};

/** "6 Nov 2026, 8:00 PM – 11:00 PM" (same day) or two full date-times. */
const eventWhen = (startsAt: string, endsAt: string | null, locale: Locale) => {
  const start = formatDateTime(startsAt, locale);
  if (!endsAt) {
    return start;
  }
  const sameDay =
    new Date(endsAt).getTime() - new Date(startsAt).getTime() <
    24 * 60 * 60 * 1000;
  return `${start} – ${sameDay ? formatTime(endsAt, locale) : formatDateTime(endsAt, locale)}`;
};

const EventPage = async ({ params }: EventProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const event = await getEvent(slug);
  if (!event) {
    notFound();
  }
  const [t, rsvps] = await Promise.all([
    getTranslations({ locale, namespace: "web.events" }),
    getRsvpCount(event.id),
  ]);
  const title = localized(event, "title", locale);
  const description = localized(event, "description", locale);
  const cover = editorialUrl(event.cover_image);
  const ended = new Date(event.ends_at ?? event.starts_at) < new Date();

  return (
    <article className="container mx-auto max-w-4xl px-4 py-10">
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": "Event",
          ...(description
            ? { description: markdownToText(description, 300) }
            : {}),
          ...(event.ends_at ? { endDate: event.ends_at } : {}),
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          ...(cover ? { image: [cover] } : {}),
          location: {
            "@type": "Place",
            address: event.location,
            name: event.location,
          },
          name: title,
          organizer: {
            "@type": "Organization",
            name: project.name,
            url: siteUrl().href,
          },
          startDate: event.starts_at,
          url: new URL(`/${locale}/events/${slug}`, siteUrl()).href,
        }}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href="/events"
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <h1 className="mb-6 text-balance font-bold text-4xl tracking-tight">
        {title}
      </h1>
      {cover ? (
        <CoverImage
          alt={title}
          className="mb-8 aspect-video"
          priority
          sizes="(min-width: 768px) 56rem, 100vw"
          src={cover}
        />
      ) : null}
      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <div>
          {description ? (
            <Markdown
              className="prose prose-neutral dark:prose-invert max-w-none"
              locale={locale}
              source={description}
            />
          ) : null}
        </div>
        <aside className="flex h-fit flex-col gap-4 rounded-lg border p-5">
          <div className="flex gap-3">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-pink-text"
            />
            <div>
              <p className="font-medium text-sm">{t("when")}</p>
              <p className="text-muted-foreground text-sm">
                {eventWhen(event.starts_at, event.ends_at, locale)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-pink-text"
            />
            <div>
              <p className="font-medium text-sm">{t("where")}</p>
              <p className="text-muted-foreground text-sm">{event.location}</p>
            </div>
          </div>
          {event.capacity ? (
            <div className="flex gap-3">
              <Users
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-pink-text"
              />
              <div>
                <p className="font-medium text-sm">{t("capacity")}</p>
                <p className="text-muted-foreground text-sm">
                  {formatNumber(event.capacity, locale)}
                </p>
              </div>
            </div>
          ) : null}
          {ended ? (
            <p className="text-muted-foreground text-sm">{t("ended")}</p>
          ) : (
            <>
              {rsvps === null ? null : (
                <p className="text-sm">
                  {rsvps > 0
                    ? t("rsvps", {
                        count: rsvps,
                        number: formatNumber(rsvps, locale),
                      })
                    : t("noRsvps")}
                </p>
              )}
              <Button asChild className="w-full">
                <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/events")}>
                  {t("rsvp")}
                </a>
              </Button>
            </>
          )}
        </aside>
      </div>
    </article>
  );
};

export default EventPage;
