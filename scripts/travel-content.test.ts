import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const directory = join(
  import.meta.dirname,
  "../packages/database/supabase/content/travel"
);
const ONE_DO_BLOCK = /^do \$do\$/gm;
const PUBLISHED = /'published'/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DOC_KEY = /^[a-z0-9_]{2,40}$/;
const HTTP = /^https?:\/\//;
const ISO_CODE = /^[A-Z]{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;
const TANWEEN_ON_ALIF = /اً/;
// Latin letters in Arabic text are only allowed inside « » (values typed
// exactly), in emails and in web addresses.
const QUOTED = /«[^»]*»/g;
const EMAIL_OR_URL = /\S+@\S+|\b[\w-]+(\.[\w-]+)+\b/g;
const LATIN = /[A-Za-z]/;

const files = readdirSync(directory).filter((name) => name.endsWith(".sql"));

interface Line {
  readonly anchor: string | null;
  readonly checked_on: string;
  readonly confidence: string;
  readonly copies: number | null;
  readonly detail_ar: string | null;
  readonly detail_en: string | null;
  readonly doc_key: string | null;
  readonly kind: string;
  readonly lead_days: number | null;
  readonly minors_only: boolean;
  readonly source_url: string;
  readonly title_ar: string;
  readonly title_en: string;
}

interface Route {
  readonly apply_at_ar: string | null;
  readonly apply_at_en: string | null;
  readonly ask_ar: string | null;
  readonly ask_en: string | null;
  readonly checked_on: string;
  readonly country: string;
  readonly lines: readonly Line[];
  readonly note_ar: string | null;
  readonly note_en: string | null;
  readonly slug: string;
  readonly visa_ar: string;
  readonly visa_en: string;
}

const routes = (sql: string): Route[] => {
  const start = sql.indexOf("$json$") + "$json$".length;
  return JSON.parse(sql.slice(start, sql.indexOf("$json$", start)));
};

const arabicTexts = (route: Route) => [
  route.visa_ar,
  route.apply_at_ar,
  route.ask_ar,
  route.note_ar,
  ...route.lines.flatMap((line) => [line.title_ar, line.detail_ar]),
];

describe.each(files)("%s", (file) => {
  const sql = readFileSync(join(directory, file), "utf8");
  const rows = routes(sql);

  test("is one do block that only writes drafts", () => {
    expect(sql.match(ONE_DO_BLOCK)).toHaveLength(1);
    expect(sql).toContain("'draft', (item ->> 'checked_on')::date");
    expect(sql).not.toMatch(PUBLISHED);
  });

  test("only rewrites the import's own untouched drafts", () => {
    expect(sql).toContain("found_row.status <> 'draft'");
    expect(sql).toContain("found_row.updated_at <> found_row.created_at");
    expect(sql).toContain("q.created_at <> found_row.created_at");
  });

  test("slugs are unique and valid", () => {
    const slugs = rows.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(SLUG);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });

  test("routes fit the table", () => {
    for (const row of rows) {
      expect(row.country, row.slug).toMatch(ISO_CODE);
      expect(row.checked_on, row.slug).toMatch(DATE);
      for (const [text, max] of [
        [row.visa_ar, 200],
        [row.visa_en, 200],
        [row.apply_at_ar, 1000],
        [row.apply_at_en, 1000],
        [row.ask_ar, 500],
        [row.ask_en, 500],
        [row.note_ar, 2000],
        [row.note_en, 2000],
      ] as const) {
        expect((text ?? "").length, row.slug).toBeLessThanOrEqual(max);
      }
      expect(row.visa_ar.length, row.slug).toBeGreaterThan(0);
      expect(row.lines.length, row.slug).toBeGreaterThan(0);
    }
  });

  test("lines fit the table, with a source and a confidence", () => {
    for (const row of rows) {
      for (const line of row.lines) {
        const label = `${row.slug}: ${line.title_en}`;
        expect(["document", "task", "question"], label).toContain(line.kind);
        expect(["official", "secondary", "unconfirmed"], label).toContain(
          line.confidence
        );
        expect(line.kind === "document", label).toBe(line.doc_key !== null);
        if (line.doc_key) {
          expect(line.doc_key, label).toMatch(DOC_KEY);
        }
        expect(line.anchor === null, label).toBe(line.lead_days === null);
        if (line.anchor) {
          expect(["appointment", "departure"], label).toContain(line.anchor);
        }
        if (line.copies !== null) {
          expect(line.copies, label).toBeLessThanOrEqual(20);
        }
        // A question is never presented as an official requirement.
        if (line.kind === "question") {
          expect(line.confidence, label).not.toBe("official");
        }
        expect(line.source_url, label).toMatch(HTTP);
        expect(line.checked_on, label).toMatch(DATE);
        expect(line.title_ar.length, label).toBeLessThanOrEqual(200);
        expect(line.title_en.length, label).toBeLessThanOrEqual(200);
        expect((line.detail_ar ?? "").length, label).toBeLessThanOrEqual(2000);
        expect((line.detail_en ?? "").length, label).toBeLessThanOrEqual(2000);
      }
    }
  });

  test("Arabic keeps Latin digits, tanween before the alif and no stray Latin", () => {
    for (const row of rows) {
      for (const text of arabicTexts(row)) {
        if (!text) {
          continue;
        }
        expect(text, row.slug).not.toMatch(ARABIC_INDIC_DIGITS);
        expect(text, row.slug).not.toMatch(TANWEEN_ON_ALIF);
        expect(
          text.replace(QUOTED, "").replace(EMAIL_OR_URL, ""),
          row.slug
        ).not.toMatch(LATIN);
      }
    }
  });
});
