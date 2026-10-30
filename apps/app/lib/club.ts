import type { Enums } from "@repo/database";

/**
 * The IDEA Club, one page for each part:
 * - `/club`: this week, featured events and opportunities, the latest
 *   reads and the Telegram rooms;
 * - `/club/events` (`/club/events/<slug>`), `/club/opportunities`
 *   (`/club/opportunities/<slug>`) and `/club/surveys` (`/club/surveys/<id>`):
 *   things to take part in, by date or deadline;
 * - `/club/read` (`?topic=news|stories|guides`) and `/club/read/<slug>`:
 *   posts, newest first.
 * The member's tickets, applications and surveys are in the Pass
 * (`/pass/tickets`, `/pass/applications`).
 */
export const joinFilters = ["events", "opportunities", "surveys"] as const;

export type JoinFilter = (typeof joinFilters)[number];

export const isJoinFilter = (value: unknown): value is JoinFilter =>
  typeof value === "string" &&
  (joinFilters as readonly string[]).includes(value);

export type PostTopic = Enums<"post_topic">;

export const postTopics = [
  "news",
  "stories",
  "guides",
] as const satisfies readonly PostTopic[];

export const isPostTopic = (value: unknown): value is PostTopic =>
  typeof value === "string" &&
  (postTopics as readonly string[]).includes(value);

export const clubPath = "/club";

/** The list of one kind of thing to take part in (the Club home without one). */
export const joinPath = (filter?: JoinFilter) =>
  filter ? `/club/${filter}` : clubPath;

/** Read, showing one topic (every post without one). */
export const topicPath = (topic?: PostTopic) =>
  topic ? `/club/read?topic=${topic}` : "/club/read";

/** A post (a story, guide or news item). */
export const postPath = (slug: string) =>
  `/club/read/${encodeURIComponent(slug)}`;

/** An event, with its RSVP or ticket. */
export const eventPath = (slug: string) =>
  `/club/events/${encodeURIComponent(slug)}`;

/** A job, internship, scholarship, competition or program. */
export const opportunityPath = (slug: string) =>
  `/club/opportunities/${encodeURIComponent(slug)}`;

/** A survey to answer, or (for its creator) its results. */
export const surveyPath = (id: string) =>
  `/club/surveys/${encodeURIComponent(id)}`;

/** The order a ticket, survey or application was paid with. */
export const receiptPath = (orderId: string) =>
  `/pass/orders/${encodeURIComponent(orderId)}`;

/** The tabs of `/pass/applications`: what the member applied to or made. */
export const yoursTabs = [
  "applications",
  "surveys",
  "submissions",
  "following",
] as const;

export type YoursTab = (typeof yoursTabs)[number];

export const isYoursTab = (value: unknown): value is YoursTab =>
  typeof value === "string" && (yoursTabs as readonly string[]).includes(value);

/** `/pass/applications`, on one of its tabs. */
export const applicationsPath = (tab?: YoursTab) =>
  tab && tab !== "applications"
    ? `/pass/applications?tab=${tab}`
    : "/pass/applications";

interface Dated {
  /** When it happens, or the deadline to take part; null when open-ended. */
  at: string | null;
  key: string;
}

/** Soonest date or deadline first, open-ended ones last. */
export const byDateOrDeadline = <T extends Dated>(items: readonly T[]) =>
  [...items].sort((a, b) => {
    if (a.at === b.at) {
      return a.key.localeCompare(b.key);
    }
    if (a.at === null) {
      return 1;
    }
    if (b.at === null) {
      return -1;
    }
    return a.at.localeCompare(b.at);
  });

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether `at` falls in the seven days from `now` (the Club's "This week"). */
export const isThisWeek = (at: string | null, now = new Date()) => {
  if (!at) {
    return false;
  }
  const time = new Date(at).getTime();
  return time >= now.getTime() && time < now.getTime() + WEEK_MS;
};
