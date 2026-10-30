import { TZDate } from "@date-fns/tz";
import { TIME_ZONE } from "@repo/internationalization/format";

const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Reads a `datetime-local` value ("2026-11-04T18:30") as a time in the
 * project time zone (Baghdad), whatever the browser's or server's zone, and
 * returns an ISO timestamp. Null when the value is not a valid date-time.
 */
export const fromBaghdadInput = (value: string): string | null => {
  const match = LOCAL_DATE_TIME.exec(value.trim());
  if (!match) {
    return null;
  }
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part ?? 0)) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const date = new TZDate(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    TIME_ZONE
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return new Date(date.getTime()).toISOString();
};

/** An ISO timestamp as a `datetime-local` value in Baghdad time. */
export const toBaghdadInput = (iso: string | null | undefined) => {
  if (!iso) {
    return "";
  }
  const date = new TZDate(new Date(iso), TIME_ZONE);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** The first day of the month (YYYY-MM-DD) in Baghdad, `offset` months away. */
export const monthStart = (now: Date, offset = 0) => {
  const local = new TZDate(now, TIME_ZONE);
  const start = new TZDate(
    local.getFullYear(),
    local.getMonth() + offset,
    1,
    TIME_ZONE
  );
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
};

/** The start of the current Baghdad month as an ISO timestamp. */
export const monthStartIso = (now: Date) =>
  fromBaghdadInput(`${monthStart(now)}T00:00`) as string;

/** Today's date (YYYY-MM-DD) in Baghdad. */
export const todayInBaghdad = (now: Date = new Date()) => {
  const local = new TZDate(now, TIME_ZONE);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
};

/** 30 June of the academic year today is in (YYYY-MM-DD, Baghdad). */
export const academicYearEnd = (now: Date = new Date()) => {
  const local = new TZDate(now, TIME_ZONE);
  const year = local.getFullYear() + (local.getMonth() >= 6 ? 1 : 0);
  return `${year}-06-30`;
};
