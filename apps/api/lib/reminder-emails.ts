import type { Database, Json } from "@repo/database";
import {
  type DeadlineReminderKind,
  type DeadlineReminderLocale,
  type DeadlineReminderProps,
  DeadlineReminderTemplate,
  deadlineReminderSubject,
} from "@repo/email/templates/deadline-reminder";
import {
  formatDate,
  formatNumber,
  intlLocale,
} from "@repo/internationalization/format";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

/**
 * Deadline reminders by email: an opportunity the member follows closing
 * soon (`opportunity_deadline`, from `notify_opportunity_followers`) and
 * Travel Kit lines falling due (`travel_due`, from `notify_travel_kits`).
 * `claim_email_notifications` hands out the notifications not emailed yet
 * and marks them emailed in the same statement, so none goes out twice (a
 * failed send is not retried; the notification still reached the app,
 * Droid, push and WhatsApp).
 */

export const EMAIL_EVENTS = ["opportunity_deadline", "travel_due"] as const;

type EmailEvent = (typeof EMAIL_EVENTS)[number];

const KINDS: Record<EmailEvent, DeadlineReminderKind> = {
  opportunity_deadline: "opportunity",
  travel_due: "travel",
};

export interface ReminderEmailDeps {
  admin: SupabaseClient<Database>;
  logger: { error: (message: string) => void };
  send: (email: {
    react: ReactElement;
    subject: string;
    to: string;
  }) => Promise<unknown>;
  /** Where a notification's link opens on the website (`notificationUrl`). */
  url: (link: string | null, locale: DeadlineReminderLocale) => string;
}

export interface ReminderEmailRow {
  data: Json;
  email: string | null;
  event: string;
  link: string | null;
  locale: string | null;
}

export interface ReminderEmailSummary {
  failed: number;
  sent: number;
  skipped: number;
}

const asRecord = (data: Json): Record<string, Json | undefined> =>
  data && typeof data === "object" && !Array.isArray(data) ? data : {};

const text = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const isEmailEvent = (event: string): event is EmailEvent =>
  (EMAIL_EVENTS as readonly string[]).includes(event);

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar day (`2027-01-10`) at midday UTC, so Baghdad time keeps the day. */
const day = (value: string) =>
  CALENDAR_DAY.test(value) ? `${value}T12:00:00Z` : value;

const countryName = (code: string, locale: DeadlineReminderLocale) => {
  if (!code) {
    return "";
  }
  try {
    return (
      new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(
        code
      ) ?? code
    );
  } catch {
    return code;
  }
};

/**
 * The email's content for a claimed notification, or null when it can't
 * be written (another event, no title or no date). Dates in Baghdad time
 * with Latin digits; a Travel Kit with several lines due names the first
 * and how many more.
 */
export const deadlineReminderProps = (
  row: Pick<ReminderEmailRow, "data" | "event" | "link" | "locale">,
  url: ReminderEmailDeps["url"]
): DeadlineReminderProps | null => {
  if (!isEmailEvent(row.event)) {
    return null;
  }
  const locale: DeadlineReminderLocale = row.locale === "en" ? "en" : "ar";
  const data = asRecord(row.data);
  const english = text(data.title_en);
  const arabic = text(data.title_ar);
  const title = (locale === "ar" ? arabic : english) || english || arabic;
  const kind = KINDS[row.event];
  const due = text(kind === "travel" ? data.due_on : data.deadline);
  if (!(title && due)) {
    return null;
  }
  const props: DeadlineReminderProps = {
    date: formatDate(day(due), locale, "long"),
    href: url(row.link, locale),
    kind,
    locale,
    title,
  };
  if (kind === "opportunity") {
    return props;
  }
  const count = Number(text(data.count));
  return {
    ...props,
    country: countryName(text(data.country), locale),
    more:
      Number.isFinite(count) && count > 1
        ? formatNumber(count - 1, locale)
        : undefined,
  };
};

/** Emails the reminders not emailed yet; one failed email never stops the others. */
export const sendReminderEmails = async (
  deps: ReminderEmailDeps
): Promise<ReminderEmailSummary> => {
  const { data, error } = await deps.admin.rpc("claim_email_notifications", {
    events: [...EMAIL_EVENTS],
  });
  if (error) {
    throw new Error(error.message);
  }

  const summary: ReminderEmailSummary = { failed: 0, sent: 0, skipped: 0 };
  const results = await Promise.allSettled(
    (data ?? []).map(async (row) => {
      const props = row.email ? deadlineReminderProps(row, deps.url) : null;
      if (!(row.email && props)) {
        return false;
      }
      await deps.send({
        react: DeadlineReminderTemplate(props),
        subject: deadlineReminderSubject(props),
        to: row.email,
      });
      return true;
    })
  );
  for (const result of results) {
    if (result.status === "rejected") {
      summary.failed += 1;
      deps.logger.error(
        `Reminder email failed: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`
      );
    } else {
      summary[result.value ? "sent" : "skipped"] += 1;
    }
  }
  return summary;
};
