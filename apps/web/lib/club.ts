import type { Enums } from "@repo/database";

/**
 * The IDEA Club at `/club`, in three parts:
 * - **Join** (`#join`): things to take part in, by date or deadline:
 *   events and surveys, filtered with `?show=events|surveys`
 *   (opportunities join in Stage 5);
 * - **Read** (`#read`): posts in one feed, newest first, filtered by topic
 *   (`?topic=news|stories|guides`);
 * - **Yours** (`#yours`): the member's tickets, surveys and submissions.
 * Posts and events open at `/club/<slug>`.
 */
export const joinFilters = ["events", "surveys"] as const;

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

/** Join, showing one kind of thing (all of them without one). */
export const joinPath = (filter?: JoinFilter) =>
  filter ? `/club?show=${filter}#join` : "/club#join";

/** Read, showing one topic (every post without one). */
export const topicPath = (topic?: PostTopic) =>
  topic ? `/club?topic=${topic}#read` : "/club#read";

/** A post or an event. */
export const clubItemPath = (slug: string) => `/club/${slug}`;

/** A survey to answer, or (for its creator) its results. */
export const surveyPath = (id: string) =>
  `/club/surveys/${encodeURIComponent(id)}`;

/** The order a ticket, survey or application was paid with. */
export const receiptPath = (orderId: string) =>
  `/pass/orders/${encodeURIComponent(orderId)}`;

interface Dated {
  /** When it happens, or the deadline to take part; null when open-ended. */
  at: string | null;
  key: string;
}

/** Join's order: soonest date or deadline first, open-ended ones last. */
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
