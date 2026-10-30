import { localized } from "@repo/commerce";
import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
  formatTime,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { CalendarDays, MapPin, MoveLeft, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { Dock } from "@/components/dock";
import { RsvpButton } from "@/components/rsvp-button";
import { eventPath, joinPath } from "@/lib/club";
import { editorialUrl, type getEvent, getRsvpCount } from "@/lib/data";
import { seatsLeft } from "@/lib/events";
import { Markdown, markdownToText } from "@/lib/markdown";
import { siteUrl } from "@/lib/metadata";

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

/** An event: when and where, places, RSVPs and the RSVP button. */
export const EventArticle = async ({
  event,
  locale,
}: {
  readonly event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
  readonly locale: Locale;
}) => {
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
          url: new URL(localePath(locale, eventPath(event.slug)), siteUrl())
            .href,
        }}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={joinPath("events")}
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
              <Dock>
                <div className="grid gap-1 md:w-full">
                  <RsvpButton
                    eventId={event.id}
                    full={seatsLeft(event.capacity, rsvps ?? undefined) === 0}
                  />
                </div>
              </Dock>
            </>
          )}
        </aside>
      </div>
    </article>
  );
};
