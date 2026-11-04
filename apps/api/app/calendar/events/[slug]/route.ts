import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { localePath } from "@repo/internationalization";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { buildCalendar } from "@/lib/ics";

const FILE_PATH = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.ics$/;

const CALENDAR_NAMES = {
  ar: "فعاليات ايديا",
  en: "The IDEA events",
} as const;

const notFound = () => new Response("Not found", { status: 404 });

/** The same columns as the personal feed (`/calendar/<token>.ics`). */
const EVENT_SELECT =
  "id, slug, title_ar, title_en, description_ar, description_en, location, starts_at, ends_at, updated_at" as const;

/**
 * GET /calendar/events/<slug>.ics[?locale=ar|en] — one published event as an
 * iCalendar file, for "Add to calendar" on the event's page. Public: it holds
 * only what the event page shows. Unpublished or unknown events are 404.
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> => {
  const slug = FILE_PATH.exec((await params).slug)?.[1];
  if (!slug) {
    return notFound();
  }
  const locale =
    new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ar";

  try {
    const { data: event, error } = await createAdminClient()
      .from("events")
      .select(EVENT_SELECT)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!event) {
      return notFound();
    }

    const body = buildCalendar({
      events: [
        {
          description:
            (locale === "en" ? event.description_en : event.description_ar) ??
            event.description_en ??
            event.description_ar,
          endsAt: event.ends_at ? new Date(event.ends_at) : null,
          id: event.id,
          location: event.location,
          startsAt: new Date(event.starts_at),
          title:
            (locale === "en" ? event.title_en : event.title_ar) ||
            event.title_en,
          updatedAt: new Date(event.updated_at),
          url: `${project.url}${localePath(locale, `/club/events/${event.slug}`)}`,
        },
      ],
      name: CALENDAR_NAMES[locale],
      timeZone: project.region.timeZone,
    });

    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
        "Content-Type": "text/calendar; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    log.error(`Event calendar file failed: ${parseError(error)}`);
    return new Response("Calendar unavailable", { status: 500 });
  }
};
