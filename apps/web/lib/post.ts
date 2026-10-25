import type { Enums } from "@repo/database";

/**
 * The IDEA Post's sections, in the order they're shown. Each has its page at
 * `/post/<section>`; posts live at `/post/<slug>` (the database keeps posts
 * off the section names). Members' work is part of Stories, and events have
 * their own pages under `/post/events`.
 */
export const postSections = [
  "news",
  "stories",
  "learn",
] as const satisfies readonly Enums<"post_section">[];

export type PostSection = (typeof postSections)[number];

export const isPostSection = (value: string): value is PostSection =>
  (postSections as readonly string[]).includes(value);

/** A post's section as shown (old members' work reads as Stories). */
export const sectionOf = (section: Enums<"post_section">): PostSection =>
  section === "members" ? "stories" : section;

export const postPath = (slug: string) => `/post/${slug}`;

export const sectionPath = (section: PostSection) => `/post/${section}`;

export const eventsPath = "/post/events";

export const eventPath = (slug: string) => `${eventsPath}/${slug}`;
