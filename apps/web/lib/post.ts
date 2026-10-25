import type { Enums } from "@repo/database";

/**
 * The IDEA Post's sections, in the order they're shown. Each has its page at
 * `/post/<section>`; posts live at `/post/<slug>` (the database keeps posts
 * off the section names).
 */
export const postSections = [
  "news",
  "stories",
  "members",
  "learn",
] as const satisfies readonly Enums<"post_section">[];

export type PostSection = (typeof postSections)[number];

export const isPostSection = (value: string): value is PostSection =>
  (postSections as readonly string[]).includes(value);

export const postPath = (slug: string) => `/post/${slug}`;

export const sectionPath = (section: PostSection) => `/post/${section}`;
