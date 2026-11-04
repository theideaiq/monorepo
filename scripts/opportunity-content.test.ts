import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const directory = join(
  import.meta.dirname,
  "../packages/database/supabase/content/opportunities"
);
const ONE_DO_BLOCK = /^do \$do\$/gm;
const OTHER_STATUS = /status\s*=\s*'(?!draft)|'approved'/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTPS = /^https:\/\//;
const ISO_CODE = /^[A-Z]{2}$/;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/;
const TANWEEN_ON_ALIF = /\u0627\u064B/;

const files = readdirSync(directory).filter((name) => name.endsWith(".sql"));

type Item = Record<string, unknown> & {
  readonly apply_url: string | null;
  readonly destination_countries: string[];
  readonly host: string;
  readonly location: string | null;
  readonly remote: boolean;
  readonly slug: string;
  readonly source_url: string;
  readonly summary_ar: string;
  readonly summary_en: string;
  readonly title_ar: string;
  readonly title_en: string;
};

const items = (sql: string): Item[] => {
  const start = sql.indexOf("$json$") + "$json$".length;
  return JSON.parse(sql.slice(start, sql.indexOf("$json$", start)));
};

describe.each(files)("%s", (file) => {
  const sql = readFileSync(join(directory, file), "utf8");
  const rows = items(sql);

  test("is one do block that only writes drafts", () => {
    expect(sql.match(ONE_DO_BLOCK)).toHaveLength(1);
    expect(sql).toContain("item ->> 'slug', host_id, 'draft',");
    expect(sql).not.toMatch(OTHER_STATUS);
  });

  test("only updates the import's own untouched drafts", () => {
    expect(sql).toContain("found_row.status <> 'draft'");
    expect(sql).toContain("found_row.updated_at <> found_row.created_at");
    expect(sql).toContain("found_row.created_by is not null");
  });

  test("slugs are unique and valid", () => {
    const slugs = rows.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(SLUG);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });

  test("fields fit the table", () => {
    for (const row of rows) {
      expect(row.summary_ar.length, row.slug).toBeLessThanOrEqual(300);
      expect(row.summary_en.length, row.slug).toBeLessThanOrEqual(300);
      expect(row.title_ar.length, row.slug).toBeLessThanOrEqual(160);
      expect(row.title_en.length, row.slug).toBeLessThanOrEqual(160);
      expect(row.host.length, row.slug).toBeLessThanOrEqual(120);
      expect(row.source_url, row.slug).toMatch(HTTPS);
      if (row.apply_url) {
        expect(row.apply_url, row.slug).toMatch(HTTPS);
      }
      expect(row.remote || row.location, row.slug).toBeTruthy();
      for (const code of row.destination_countries) {
        expect(code, row.slug).toMatch(ISO_CODE);
      }
    }
  });

  test("Arabic keeps Latin digits and tanween before the alif", () => {
    for (const row of rows) {
      for (const text of [row.title_ar, row.summary_ar]) {
        expect(text, row.slug).not.toMatch(ARABIC_INDIC_DIGITS);
        expect(text, row.slug).not.toMatch(TANWEEN_ON_ALIF);
      }
    }
  });
});
