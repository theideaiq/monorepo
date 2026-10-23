/**
 * A minimal iCalendar (RFC 5545) writer for the events feed: escaped text,
 * UTC times, CRLF line endings and lines folded at 75 octets.
 */

export interface CalendarEvent {
  description?: string | null;
  /** Defaults to two hours after the start. */
  endsAt?: Date | null;
  id: string;
  location?: string | null;
  startsAt: Date;
  title: string;
  updatedAt: Date;
  url?: string | null;
}

export interface CalendarFeed {
  events: CalendarEvent[];
  name: string;
  timeZone?: string;
}

export const PRODID = "-//The IDEA//Events//EN";
export const UID_DOMAIN = "theideaiq.com";
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_LINE_OCTETS = 75;
const TEXT_SPECIALS = /[\\;,]/g;
const NEWLINES = /\r\n|\r|\n/g;
const DATE_PUNCTUATION = /[-:]/g;
const MILLISECONDS = /\.\d{3}/;

/** Escapes a TEXT value: backslash, semicolon, comma and newlines. */
export const escapeText = (value: string) =>
  value
    .replace(TEXT_SPECIALS, (character) => `\\${character}`)
    .replace(NEWLINES, "\\n");

/** 2026-11-05T17:30:00.000Z → 20261105T173000Z */
export const formatUtc = (date: Date) =>
  date.toISOString().replace(MILLISECONDS, "").replace(DATE_PUNCTUATION, "");

const encoder = new TextEncoder();

/** Folds a content line at 75 octets without splitting a character. */
export const foldLine = (line: string) => {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    // Continuation lines start with a space, which counts toward the limit.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += character;
    octets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
};

const eventLines = (event: CalendarEvent) => {
  const endsAt =
    event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_DURATION_MS);
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@${UID_DOMAIN}`,
    `DTSTAMP:${formatUtc(event.updatedAt)}`,
    `LAST-MODIFIED:${formatUtc(event.updatedAt)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.description
      ? [`DESCRIPTION:${escapeText(event.description)}`]
      : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
  ];
};

export const buildCalendar = ({
  events,
  name,
  timeZone = "Asia/Baghdad",
}: CalendarFeed) =>
  `${[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${timeZone}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n")}\r\n`;
