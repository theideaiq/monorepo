"use client";

import { localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import {
  CalendarDaysIcon,
  CheckIcon,
  CopyIcon,
  MapPinIcon,
  RefreshCwIcon,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { env } from "@/env";
import {
  calendarFeedUrl,
  upcomingRsvps,
  useCalendarToken,
  useMyRsvps,
  useRotateCalendarToken,
  useRsvp,
  useRsvpCount,
  useUpcomingEvents,
  webcalUrl,
} from "@/lib/community-queries";
import { toRsvpError } from "@/lib/errors";
import { seatsLeft } from "@/lib/events";
import { editorialImage } from "@/lib/images";

type EventRow = NonNullable<
  ReturnType<typeof useUpcomingEvents>["data"]
>[number];

const EventCard = ({
  event,
  going,
}: {
  readonly event: EventRow;
  readonly going: boolean;
}) => {
  const t = useTranslations("app.events");
  const locale = useLocale();
  const count = useRsvpCount(event.id);
  const rsvp = useRsvp();
  const left = seatsLeft(event.capacity, count.data);
  const full = left === 0 && !going;
  const title = localized(event, "title", locale);
  const description = localized(event, "description", locale);
  const cover = editorialImage(event.cover_image);
  let rsvpLabel = going ? t("cancelRsvp") : t("rsvp");
  if (rsvp.isPending) {
    rsvpLabel = t("rsvping");
  }

  return (
    <li>
      <Card className="h-full overflow-hidden pt-0">
        {cover ? (
          <div className="relative aspect-[2/1] bg-muted">
            <Image
              alt={title}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              src={cover}
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[4/1] items-center justify-center bg-gradient-to-br from-primary/15 to-brand/15">
            <CalendarDaysIcon className="size-8 text-primary/60" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="leading-snug">{title}</CardTitle>
          <CardDescription className="grid gap-1">
            <span className="flex items-center gap-1.5">
              <CalendarDaysIcon className="size-4 shrink-0" />
              {formatDateTime(event.starts_at, locale)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4 shrink-0" />
              {event.location}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid flex-1 content-between gap-4">
          {description ? (
            <p className="line-clamp-4 whitespace-pre-line text-muted-foreground text-sm">
              {description}
            </p>
          ) : null}
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {going ? (
                <Badge>
                  <CheckIcon />
                  {t("going")}
                </Badge>
              ) : null}
              {full ? <Badge variant="outline">{t("full")}</Badge> : null}
              {count.data !== undefined && left === null ? (
                <span className="text-muted-foreground">
                  {t("attending", { count: formatNumber(count.data, locale) })}
                </span>
              ) : null}
              {left !== null && left > 0 ? (
                <span className="text-muted-foreground">
                  {t("seatsLeft", { count: formatNumber(left, locale) })}
                </span>
              ) : null}
            </div>
            <Button
              disabled={rsvp.isPending || full}
              onClick={() => rsvp.mutate({ eventId: event.id, going: !going })}
              variant={going ? "outline" : "default"}
            >
              {rsvpLabel}
            </Button>
            {rsvp.isError ? (
              <p className="text-destructive text-xs" role="alert">
                {t(`errors.${toRsvpError(rsvp.error)}`)}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </li>
  );
};

const CalendarLink = () => {
  const t = useTranslations("app.events.calendar");
  const id = useId();
  const token = useCalendarToken();
  const rotate = useRotateCalendarToken();
  const [copied, setCopied] = useState(false);
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  const feed =
    apiUrl && token.data ? calendarFeedUrl(apiUrl, token.data) : null;

  const copy = async () => {
    if (!feed) {
      return;
    }
    try {
      await navigator.clipboard.writeText(feed);
      setCopied(true);
    } catch {
      // Clipboard blocked: the link stays selectable in the field.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {token.isPending && apiUrl ? <SectionSpinner className="py-4" /> : null}
        {token.isError || !apiUrl ? (
          <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
        ) : null}
        {feed ? (
          <>
            <label className="sr-only" htmlFor={`${id}-feed`}>
              {t("linkLabel")}
            </label>
            <Input
              className="font-mono text-xs"
              dir="ltr"
              id={`${id}-feed`}
              onFocus={(event) => event.target.select()}
              readOnly
              value={feed}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy} size="sm" variant="outline">
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? t("copied") : t("copy")}
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={webcalUrl(feed)}>
                  <CalendarDaysIcon />
                  {t("open")}
                </a>
              </Button>
              <Button
                disabled={rotate.isPending}
                onClick={() => {
                  setCopied(false);
                  rotate.mutate();
                }}
                size="sm"
                variant="ghost"
              >
                <RefreshCwIcon />
                {rotate.isPending ? t("resetting") : t("reset")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">{t("resetHint")}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

/** Upcoming events with RSVPs, the user's events and their calendar feed. */
export const Events = () => {
  const t = useTranslations("app.events");
  const locale = useLocale();
  const events = useUpcomingEvents();
  const rsvps = useMyRsvps();
  const goingIds = new Set(rsvps.data?.map((rsvp) => rsvp.event_id));
  const mine = rsvps.data ? upcomingRsvps(rsvps.data) : [];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <section className="grid gap-4">
            <h2 className="font-semibold text-lg">{t("upcoming")}</h2>
            {events.isPending ? <SectionSpinner /> : null}
            {events.isError ? (
              <ErrorState onRetry={() => events.refetch()} />
            ) : null}
            {events.data?.length === 0 ? (
              <p className="text-muted-foreground">{t("empty")}</p>
            ) : null}
            {events.data?.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {events.data.map((event) => (
                  <EventCard
                    event={event}
                    going={goingIds.has(event.id)}
                    key={event.id}
                  />
                ))}
              </ul>
            ) : null}
          </section>

          <aside className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("mine")}</CardTitle>
              </CardHeader>
              <CardContent>
                {mine.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("mineEmpty")}
                  </p>
                ) : (
                  <ul className="grid gap-3">
                    {mine.map(({ event }) => (
                      <li className="grid gap-0.5 text-sm" key={event.id}>
                        <span className="font-medium">
                          {localized(event, "title", locale)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(event.starts_at, locale)} ·{" "}
                          {event.location}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <CalendarLink />
          </aside>
        </div>
      </div>
    </>
  );
};
