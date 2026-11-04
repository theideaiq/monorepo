/**
 * "Add to calendar" links for a Club event: Google Calendar's template URL,
 * Outlook on the web's compose URL and the `.ics` file apps/api serves.
 * Plain functions (no React, no env) so they run anywhere and are tested.
 *
 * Times are always sent in UTC with Latin digits, whatever the page's
 * language; titles, places and details are sent as they are (Arabic stays
 * Arabic), percent-encoded with `%20` for spaces (Outlook shows a `+`
 * literally).
 */

export interface CalendarEventDetails {
  /** Plain text (not Markdown); the event page's link is added after it. */
  description?: string | null;
  /** ISO timestamp; without one the event lasts two hours, as in the feed. */
  endsAt?: string | null;
  location?: string | null;
  /** ISO timestamp. */
  startsAt: string;
  title: string;
  /** The event page, absolute. */
  url: string;
}

/** Same as the iCalendar feed (`apps/api/lib/ics.ts`). */
export const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Long descriptions make URLs that some browsers and calendars cut off. */
export const MAX_DETAILS_LENGTH = 1000;

const MILLISECONDS = /\.\d{3}Z$/;
const DATE_PUNCTUATION = /[-:]/g;
const TRAILING_SLASH = /\/+$/;
/**
 * Bidi embedding and isolate controls: invisible, and in a pasted title they
 * can flip the text around them in a calendar app.
 */
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/g;

const clean = (value: string) => value.replace(BIDI_CONTROLS, "").trim();

/** The start and end as Dates, the end defaulting to two hours later. */
export const eventTimes = ({
  endsAt,
  startsAt,
}: Pick<CalendarEventDetails, "endsAt" | "startsAt">) => {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  return {
    end:
      end && end.getTime() > start.getTime()
        ? end
        : new Date(start.getTime() + DEFAULT_DURATION_MS),
    start,
  };
};

/** 2026-11-20T16:30:00Z */
const isoUtc = (date: Date) => date.toISOString().replace(MILLISECONDS, "Z");

/** 20261120T163000Z (Google Calendar's `dates`). */
export const compactUtc = (date: Date) =>
  isoUtc(date).replace(DATE_PUNCTUATION, "");

/** The description, cut to a URL-friendly length, then the page's link. */
export const eventDetails = ({
  description,
  url,
}: Pick<CalendarEventDetails, "description" | "url">) => {
  const text = description ? clean(description) : "";
  const short =
    text.length > MAX_DETAILS_LENGTH
      ? `${text.slice(0, MAX_DETAILS_LENGTH - 1).trimEnd()}…`
      : text;
  return short ? `${short}\n\n${url}` : url;
};

/** `a=1&b=x%20y`: every value percent-encoded, spaces as %20. */
const query = (entries: (readonly [string, string])[]) =>
  entries
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

const optional = (key: string, value: string | null | undefined) =>
  value && clean(value) ? [[key, clean(value)] as const] : [];

/** Google Calendar's "create event" template, filled in. */
export const googleCalendarUrl = (event: CalendarEventDetails) => {
  const { end, start } = eventTimes(event);
  const params = query([
    ["action", "TEMPLATE"],
    ["text", clean(event.title)],
    ["dates", `${compactUtc(start)}/${compactUtc(end)}`],
    ["details", eventDetails(event)],
    ...optional("location", event.location),
  ]);
  return `https://calendar.google.com/calendar/render?${params}`;
};

/** Outlook on the web's new-event form, filled in. */
export const outlookCalendarUrl = (event: CalendarEventDetails) => {
  const { end, start } = eventTimes(event);
  const params = query([
    ["path", "/calendar/action/compose"],
    ["rru", "addevent"],
    ["subject", clean(event.title)],
    ["startdt", isoUtc(start)],
    ["enddt", isoUtc(end)],
    ["body", eventDetails(event)],
    ...optional("location", event.location),
  ]);
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
};

/** The event's `.ics` file from apps/api (`/calendar/events/<slug>.ics`). */
export const eventIcsUrl = (apiUrl: string, slug: string, locale: string) =>
  `${apiUrl.replace(TRAILING_SLASH, "")}/calendar/events/${encodeURIComponent(slug)}.ics?locale=${locale === "en" ? "en" : "ar"}`;
