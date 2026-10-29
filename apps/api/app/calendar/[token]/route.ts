import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { localePath } from "@repo/internationalization";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { buildCalendar } from "@/lib/ics";

const FEED_PATH = /^([0-9a-f-]{36})\.ics$/i;
/** Past events stay in the feed this long. */
const HISTORY_DAYS = 180;

const CALENDAR_NAMES = {
  ar: "فعاليات ايديا",
  en: "The IDEA events",
} as const;

const notFound = () => new Response("Not found", { status: 404 });

interface RsvpRow {
  events: {
    description_ar: string | null;
    description_en: string | null;
    ends_at: string | null;
    id: string;
    location: string;
    slug: string;
    starts_at: string;
    title_ar: string;
    title_en: string;
    updated_at: string;
  };
}

/**
 * GET /calendar/<token>.ics — a personal iCalendar feed of the published
 * events the person RSVP'd to. The token (profiles.calendar_token, shown by
 * `my_calendar_token()` and changed by `rotate_calendar_token()`) is the only
 * credential, so calendar apps can subscribe without signing in.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> => {
  const token = FEED_PATH.exec((await params).token)?.[1]?.toLowerCase();
  if (!token) {
    return notFound();
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, locale")
      .eq("calendar_token", token)
      .maybeSingle();
    if (profileError) {
      throw new Error(profileError.message);
    }
    if (!profile) {
      return notFound();
    }

    const since = new Date(
      Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data, error } = await admin
      .from("event_rsvps")
      .select(
        "events!inner (id, slug, title_ar, title_en, description_ar, description_en, location, starts_at, ends_at, updated_at)"
      )
      .eq("user_id", profile.id)
      .eq("events.published", true)
      .gte("events.starts_at", since);
    if (error) {
      throw new Error(error.message);
    }

    const locale = profile.locale === "en" ? "en" : "ar";
    const events = ((data ?? []) as unknown as RsvpRow[])
      .map(({ events: event }) => ({
        description:
          (locale === "en" ? event.description_en : event.description_ar) ??
          event.description_en ??
          event.description_ar,
        endsAt: event.ends_at ? new Date(event.ends_at) : null,
        id: event.id,
        location: event.location,
        startsAt: new Date(event.starts_at),
        title:
          (locale === "en" ? event.title_en : event.title_ar) || event.title_en,
        updatedAt: new Date(event.updated_at),
        url: `${project.url}${localePath(locale, `/club/${event.slug}`)}`,
      }))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    return new Response(
      buildCalendar({
        events,
        name: CALENDAR_NAMES[locale],
        timeZone: project.region.timeZone,
      }),
      {
        headers: {
          // Personal feed: cached by the calendar app, not shared caches.
          "Cache-Control": "private, max-age=900",
          "Content-Disposition": 'inline; filename="theideaiq-events.ics"',
          "Content-Type": "text/calendar; charset=utf-8",
          "X-Robots-Tag": "noindex",
        },
      }
    );
  } catch (error) {
    log.error(`Calendar feed failed: ${parseError(error)}`);
    return new Response("Calendar unavailable", { status: 500 });
  }
};
