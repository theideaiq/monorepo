import type { Enums } from "@repo/database";

/**
 * The IDEA Club's feed at `/club`: everything published, newest first,
 * filtered by chips (`/club?show=events`). Stories (with members' work),
 * news, guides and events each open at `/club/<slug>`; the database keeps
 * posts' and events' slugs apart from the filter names.
 */
export const clubFilters = ["events", "news", "stories", "guides"] as const;

export type ClubFilter = (typeof clubFilters)[number];

export const isClubFilter = (value: unknown): value is ClubFilter =>
  typeof value === "string" &&
  (clubFilters as readonly string[]).includes(value);

/** A post section's chip: members' work reads as Stories, Learn as Guides. */
export const filterOf = (section: Enums<"post_section">): ClubFilter => {
  if (section === "members") {
    return "stories";
  }
  return section === "learn" ? "guides" : section;
};

/** The post section a chip shows (events aren't posts). */
export const sectionOf = (
  filter: Exclude<ClubFilter, "events">
): Enums<"post_section"> => (filter === "guides" ? "learn" : filter);

export const clubPath = "/club";

export const filterPath = (filter: ClubFilter) => `/club?show=${filter}`;

/** A story, guide, news item or event. */
export const clubItemPath = (slug: string) => `/club/${slug}`;
