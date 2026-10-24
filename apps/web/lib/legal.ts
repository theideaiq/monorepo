import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Legal documents are Markdown files per language in content/legal
 * (`<slug>.ar.md`, `<slug>.en.md`), rendered by /legal/[slug]. Bump
 * `updated` whenever a document changes.
 */
export const legalDocuments = [
  { slug: "terms", updated: "2026-10-24" },
  { slug: "privacy", updated: "2026-10-24" },
  { slug: "refund", updated: "2026-10-24" },
  { slug: "conduct", updated: "2026-10-24" },
  { slug: "community", updated: "2026-10-24" },
] as const;

export type LegalSlug = (typeof legalDocuments)[number]["slug"];

export const isLegalSlug = (value: string): value is LegalSlug =>
  legalDocuments.some((document) => document.slug === value);

const CONTENT_DIRECTORY = join(process.cwd(), "content", "legal");

/** The document's Markdown in the given language (Arabic for other locales). */
export const readLegalDocument = (slug: LegalSlug, locale: string) =>
  readFile(
    join(CONTENT_DIRECTORY, `${slug}.${locale === "en" ? "en" : "ar"}.md`),
    "utf8"
  );
