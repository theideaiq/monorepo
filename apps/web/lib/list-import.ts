import { parseCsv } from "@repo/commerce/csv";

/**
 * "Import your list" (Pass → Saved → Lists): reads the exports members
 * download from Goodreads, The StoryGraph and Letterboxd. Only what they
 * want next is taken: Goodreads' and The StoryGraph's to-read shelf, and
 * Letterboxd's watchlist. Discogs and Steam are read by the API.
 */

export type ListSource =
  | "discogs"
  | "goodreads"
  | "letterboxd"
  | "steam"
  | "storygraph";

export interface ImportItem {
  barcode?: string;
  creator?: string;
  external_ids: Record<string, string>;
  kind: "book" | "film" | "game" | "record";
  source: ListSource;
  title: string;
  year?: number;
}

/** The most one import takes (`import_list_items`). */
export const MAX_IMPORT = 2000;

const NON_DIGITS = /\D/g;
const YEAR = /^\d{4}$/;

// Goodreads writes ISBNs as ="9780…" so spreadsheets keep the zeros.
const isbnOf = (value: string | undefined) => {
  const digits = (value ?? "").replace(NON_DIGITS, "");
  return digits.length === 13 ? digits : undefined;
};

const yearOf = (value: string | undefined) => {
  const trimmed = (value ?? "").trim().slice(0, 4);
  return YEAR.test(trimmed) ? Number(trimmed) : undefined;
};

const firstAuthor = (value: string | undefined) =>
  (value ?? "").split(",")[0]?.trim() || undefined;

type Row = Partial<Record<string, string>>;

const goodreads = (row: Row): ImportItem | null =>
  row["Exclusive Shelf"] && row["Exclusive Shelf"] !== "to-read"
    ? null
    : {
        barcode: isbnOf(row.ISBN13),
        creator: row.Author?.trim() || undefined,
        external_ids: row["Book Id"] ? { goodreads: row["Book Id"] } : {},
        kind: "book",
        source: "goodreads",
        title: row.Title?.trim() ?? "",
        year: yearOf(row["Original Publication Year"] || row["Year Published"]),
      };

const storygraph = (row: Row): ImportItem | null =>
  row["Read Status"] && row["Read Status"] !== "to-read"
    ? null
    : {
        barcode: isbnOf(row["ISBN/UID"]),
        creator: firstAuthor(row.Authors),
        external_ids: {},
        kind: "book",
        source: "storygraph",
        title: row.Title?.trim() ?? "",
      };

const letterboxd = (row: Row): ImportItem => ({
  external_ids: row["Letterboxd URI"]
    ? { letterboxd: row["Letterboxd URI"] }
    : {},
  kind: "film",
  source: "letterboxd",
  title: row.Name?.trim() ?? "",
  year: yearOf(row.Year),
});

/** Which export a file is, from its header row. */
export const listSourceOf = (header: readonly string[]) => {
  const has = (name: string) => header.includes(name);
  if (has("Exclusive Shelf") || (has("Book Id") && has("Author"))) {
    return "goodreads" as const;
  }
  if (has("ISBN/UID") || has("Read Status")) {
    return "storygraph" as const;
  }
  if (has("Letterboxd URI") && has("Name")) {
    return "letterboxd" as const;
  }
  return null;
};

const READERS = { goodreads, letterboxd, storygraph } as const;

/** The items in an export, or null when the file isn't one we know. */
export const parseListFile = (
  text: string
): { items: ImportItem[]; source: ListSource } | null => {
  const [header, ...rows] = parseCsv(text);
  const source = header ? listSourceOf(header) : null;
  if (!(header && source)) {
    return null;
  }
  const read = READERS[source];
  const items = rows
    .map((cells) =>
      read(
        Object.fromEntries(
          header.map((name, index) => [name, cells[index] ?? ""])
        )
      )
    )
    .filter((item): item is ImportItem => Boolean(item?.title))
    .slice(0, MAX_IMPORT);
  return { items, source };
};
