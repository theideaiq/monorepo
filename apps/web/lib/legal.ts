import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Legal documents are Markdown files per language in content/legal
 * (`<slug>.ar.md`, `<slug>.en.md`), rendered by /legal/[slug]. Bump
 * `updated` whenever a document changes.
 */
export const legalDocuments = [
  { slug: "terms", updated: "2026-10-28" },
  { slug: "privacy", updated: "2026-10-28" },
  { slug: "delivery", updated: "2026-10-28" },
  { slug: "returns", updated: "2026-10-28" },
  { slug: "plus", updated: "2026-10-28" },
  { slug: "rewards", updated: "2026-10-29" },
  { slug: "selling", updated: "2026-10-28" },
  { slug: "club", updated: "2026-10-28" },
  { slug: "programs", updated: "2026-10-28" },
  { slug: "surveys", updated: "2026-10-29" },
  { slug: "business", updated: "2026-10-28" },
  { slug: "accessibility", updated: "2026-10-27" },
  { slug: "security", updated: "2026-10-28" },
  { slug: "copyright", updated: "2026-10-26" },
] as const;

export type LegalSlug = (typeof legalDocuments)[number]["slug"];

export const isLegalSlug = (value: string): value is LegalSlug =>
  legalDocuments.some((document) => document.slug === value);

/** The document's Markdown in the given language (Arabic for other locales). */
export const readLegalDocument = (slug: LegalSlug, locale: string) =>
  readFile(
    join(
      process.cwd(),
      "content",
      "legal",
      `${slug}.${locale === "en" ? "en" : "ar"}.md`
    ),
    "utf8"
  );
