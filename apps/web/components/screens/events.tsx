"use client";

import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  CalendarDaysIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ErrorState, SectionSpinner } from "@/components/states";
import { env } from "@/env";
import { clubItemPath } from "@/lib/club";
import {
  calendarFeedUrl,
  upcomingRsvps,
  useCalendarToken,
  useMyRsvps,
  useRotateCalendarToken,
  webcalUrl,
} from "@/lib/community-queries";

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

/** The member's upcoming events and their calendar feed (Club → Yours). */
export const YourEvents = () => {
  const t = useTranslations("app.events");
  const locale = useLocale();
  const rsvps = useMyRsvps();
  const mine = rsvps.data ? upcomingRsvps(rsvps.data) : [];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>{t("mine")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rsvps.isPending ? <SectionSpinner className="py-4" /> : null}
          {rsvps.isError ? (
            <ErrorState onRetry={() => rsvps.refetch()} />
          ) : null}
          {rsvps.data && mine.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("mineEmpty")}</p>
          ) : null}
          {mine.length > 0 ? (
            <ul className="grid gap-3">
              {mine.map(({ event }) => (
                <li className="grid gap-0.5 text-sm" key={event.id}>
                  <Link
                    className="font-medium hover:underline"
                    href={clubItemPath(event.slug)}
                  >
                    {localized(event, "title", locale)}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(event.starts_at, locale)} · {event.location}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      <CalendarLink />
    </div>
  );
};
