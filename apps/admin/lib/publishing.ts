export type PublishMode = "draft" | "now" | "schedule";

export type PublishState = "draft" | "scheduled" | "published";

/** How a post or issue with this `published_at` looks to readers now. */
export const publishState = (
  publishedAt: string | null | undefined,
  now: Date = new Date()
): PublishState => {
  if (!publishedAt) {
    return "draft";
  }
  return new Date(publishedAt) > now ? "scheduled" : "published";
};

/**
 * The `published_at` to store for the chosen mode. Saving an already
 * published item keeps its original date; scheduling needs a future date
 * (null when it is missing or past, which the form reports as invalid).
 */
export const publishedAtFor = (
  mode: PublishMode,
  {
    current,
    now = new Date(),
    scheduledAt,
  }: { current: string | null; now?: Date; scheduledAt: string | null }
): string | null | undefined => {
  if (mode === "draft") {
    return null;
  }
  if (mode === "now") {
    return current && new Date(current) <= now ? current : now.toISOString();
  }
  return scheduledAt && new Date(scheduledAt) > now ? scheduledAt : undefined;
};
