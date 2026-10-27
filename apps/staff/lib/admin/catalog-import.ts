/**
 * The spreadsheet import (Staff → Catalog → Import): reads a CSV
 * export of the inventory sheet in the browser, validates every row,
 * compares it with the products already in the catalog and builds the
 * batches for `import_products` (migrations 20261120000200 and
 * 20261213000000). A blank cell never overwrites a value; only the fields
 * that differ are sent.
 *
 * Variants: rows that share a slug and name a version (`variant_en`, with
 * an optional `format`) become one product with a variant per row; on
 * those rows price, compare-at price, stock, SKU, barcode and pictures are
 * the variant's. The product's other fields come from its first row.
 */
import { Constants, type Json, type Tables } from "@repo/database";
import { isCatalogImage } from "./catalog-images";

const { Enums } = Constants.public;

type ProductKind = (typeof Enums.product_kind)[number];
type ProductStatus = (typeof Enums.product_status)[number];
type ProductCondition = (typeof Enums.product_condition)[number];

/** The sheet's columns, in template order. */
export const IMPORT_COLUMNS = [
  "slug",
  "name_en",
  "name_ar",
  "kind",
  "category",
  "price",
  "compare_at_price",
  "condition",
  "stock",
  "status",
  "barcode",
  "sku",
  "variant_en",
  "variant_ar",
  "format",
  "description_en",
  "description_ar",
  "image_urls",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** Other spellings accepted in the header row. */
const COLUMN_ALIASES: Record<string, ImportColumn> = {
  barcodes: "barcode",
  category_slug: "category",
  compare_at: "compare_at_price",
  description: "description_en",
  ean: "barcode",
  image: "image_urls",
  images: "image_urls",
  name: "name_en",
  qty: "stock",
  quantity: "stock",
  stock_count: "stock",
  upc: "barcode",
  variant: "variant_en",
  version: "variant_en",
};

/** Columns written as `details.<Key>` (e.g. `details.Artist`) set that specification. */
const DETAILS_PREFIX = "details.";

/** Specification keys used for the barcode and SKU columns. */
export const BARCODE_DETAIL = "Barcode";
export const SKU_DETAIL = "SKU";

export const MAX_IMAGES = 12;
const MAX_NAME = 200;
const MAX_DESCRIPTION = 10_000;
const MAX_SLUG = 120;
const MAX_DETAIL = 500;
const MAX_STOCK = 1_000_000;
const MAX_VARIANT_LABEL = 60;
/** Variants per product (the RPC accepts up to 50). */
const MAX_VARIANTS = 50;
/** Rows per `import_products` call (the RPC accepts up to 500). */
export const IMPORT_BATCH_SIZE = 100;

/** One version of a product, from a row naming one (`variant_en`). */
export interface ImportVariant {
  attributes?: Record<string, string>;
  barcode?: string;
  compare_at_price?: number;
  images?: string[];
  label_ar?: string;
  label_en: string;
  price?: number;
  sku?: string;
  stock_count?: number;
}

/** The product fields a sheet can set (the RPC's item shape, minus slug). */
export interface ImportFields {
  category?: string;
  compare_at_price?: number;
  condition?: ProductCondition;
  description_ar?: string;
  description_en?: string;
  details?: Record<string, string>;
  images?: string[];
  kind?: ProductKind;
  name_ar?: string;
  name_en?: string;
  price?: number;
  status?: ProductStatus;
  stock_count?: number;
  /** Its versions, when its rows name them; upserted by English label. */
  variants?: ImportVariant[];
}

export type ImportField = keyof ImportFields;

/** Message keys under `admin.catalog.import.errors`. */
export type RowErrorCode =
  | "compareAtNotHigher"
  | "duplicateSlug"
  | "duplicateVariant"
  | "invalidCompareAt"
  | "invalidCondition"
  | "invalidImage"
  | "invalidKind"
  | "invalidPrice"
  | "invalidSlug"
  | "invalidStatus"
  | "invalidStock"
  | "missingForNew"
  | "missingSlug"
  | "tooLong"
  | "tooManyImages"
  | "tooManyVariants"
  | "unknownCategory";

export interface RowError {
  code: RowErrorCode;
  /** The sheet column (or field) the error is about. */
  column?: string;
}

export interface ParsedRow {
  errors: RowError[];
  fields: ImportFields;
  /** Line in the file (the header is line 1). */
  line: number;
  slug: string;
  /** The version this row is, when it names one. */
  variant?: ImportVariant;
}

export type SheetProblem = "empty" | "noNameOrSlug";

export interface ParsedSheet {
  problem?: SheetProblem;
  rows: ParsedRow[];
  /** Header cells that were not recognised (ignored). */
  unknownColumns: string[];
}

/** A product as stored, with the columns the import compares. */
export type ExistingProduct = Pick<
  Tables<"products">,
  | "category_id"
  | "compare_at_price"
  | "condition"
  | "description_ar"
  | "description_en"
  | "details"
  | "images"
  | "kind"
  | "name_ar"
  | "name_en"
  | "price"
  | "slug"
  | "status"
  | "stock_count"
>;

export const EXISTING_PRODUCT_COLUMNS =
  "slug, kind, status, category_id, name_ar, name_en, description_ar, description_en, price, compare_at_price, condition, stock_count, images, details" as const;

export interface ImportItem extends ImportFields {
  slug: string;
}

export type PreviewRow =
  | {
      fields: ImportFields;
      item: ImportItem;
      line: number;
      slug: string;
      status: "new";
    }
  | {
      changed: ImportField[];
      fields: ImportFields;
      item: ImportItem;
      line: number;
      slug: string;
      status: "changed";
    }
  | { line: number; slug: string; status: "unchanged" }
  | { errors: RowError[]; line: number; slug: string; status: "error" };

export interface Category {
  id: string;
  slug: string;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

const LINE_END = /\r?\n|$/;
const CSV_SPECIAL = /[",\r\n]/;

interface CsvState {
  cell: string;
  delimiter: string;
  quoted: boolean;
  row: string[];
  rows: string[][];
}

const endRow = (state: CsvState) => {
  state.row.push(state.cell);
  state.rows.push(state.row);
  state.row = [];
  state.cell = "";
};

/** One character inside a quoted cell; returns how many extra to skip. */
const quotedChar = (state: CsvState, text: string, index: number) => {
  const char = text[index];
  if (char === '"' && text[index + 1] === '"') {
    state.cell += '"';
    return 1;
  }
  if (char === '"') {
    state.quoted = false;
  } else {
    state.cell += char;
  }
  return 0;
};

/** One character outside quotes; returns how many extra to skip. */
const plainChar = (state: CsvState, text: string, index: number) => {
  const char = text[index];
  if (char === '"' && state.cell === "") {
    state.quoted = true;
  } else if (char === state.delimiter) {
    state.row.push(state.cell);
    state.cell = "";
  } else if (char === "\n" || char === "\r") {
    endRow(state);
    return char === "\r" && text[index + 1] === "\n" ? 1 : 0;
  } else {
    state.cell += char;
  }
  return 0;
};

/**
 * Splits CSV text into rows of cells (RFC 4180: quoted cells may hold
 * commas, quotes as "" and line breaks). Accepts a UTF-8 BOM, CRLF line
 * ends, and tab-separated text pasted from a spreadsheet.
 */
export const parseCsv = (input: string): string[][] => {
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const firstLine = text.slice(0, text.search(LINE_END));
  const state: CsvState = {
    cell: "",
    delimiter:
      firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",",
    quoted: false,
    row: [],
    rows: [],
  };
  for (let index = 0; index < text.length; index += 1) {
    index += state.quoted
      ? quotedChar(state, text, index)
      : plainChar(state, text, index);
  }
  if (state.cell !== "" || state.row.length > 0) {
    endRow(state);
  }
  return state.rows;
};

/** One CSV cell, quoted when needed. */
const csvCell = (value: string) =>
  CSV_SPECIAL.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const TEMPLATE_ROWS = [
  [
    "adele-25",
    "Adele – 25",
    "أديل – 25",
    "sale",
    "music",
    "69750",
    "",
    "new",
    "1",
    "draft",
    "0889853086813",
    "VIN-0001",
    "Vinyl",
    "أسطوانة فينيل",
    "Vinyl",
    "25 by Adele, first released in 2015.",
    "ألبوم 25 من Adele، صدر أول مرة عام 2015.",
    "https://coverartarchive.org/release-group/5537624c-3d2f-4f5c-8099-df916082c85c/front-500",
  ],
  [
    "adele-25",
    "",
    "",
    "",
    "",
    "29750",
    "",
    "new",
    "2",
    "",
    "",
    "CD-0001",
    "CD",
    "قرص CD",
    "CD",
    "",
    "",
    "",
  ],
];

/**
 * The downloadable template: the header and an album in two versions (one
 * row each, sharing the slug).
 */
export const templateCsv = () =>
  `\uFEFF${[
    IMPORT_COLUMNS.join(","),
    ...TEMPLATE_ROWS.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n")}\r\n`;

// ── Cells ───────────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIACRITICS = /\p{M}+/gu;
const NOT_SLUG = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;
const EASTERN_DIGITS = /[٠-٩۰-۹]/g;
const NUMBER_NOISE = /[\s,٬_]/g;
const WHOLE_NUMBER = /^\d+(?:\.0+)?$/;

/** A slug from an English name: "Beyoncé – RENAISSANCE" → "beyonce-renaissance". */
export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replaceAll("'", "")
    .replaceAll("’", "")
    .replace(NOT_SLUG, "-")
    .replace(EDGE_DASHES, "")
    .slice(0, MAX_SLUG)
    .replace(EDGE_DASHES, "");

/**
 * A whole, non-negative number from a cell: "64,750", "٦٤٬٧٥٠" and
 * "64750.00" all read as 64750. Null when the cell isn't one.
 */
export const parseWholeNumber = (value: string): number | null => {
  const cleaned = value
    .replace(EASTERN_DIGITS, (digit) =>
      String((digit.codePointAt(0) ?? 0) % 16)
    )
    .replace(NUMBER_NOISE, "");
  if (!WHOLE_NUMBER.test(cleaned)) {
    return null;
  }
  const number = Number.parseInt(cleaned, 10);
  return Number.isSafeInteger(number) ? number : null;
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const enumValue = <T extends string>(
  values: readonly T[],
  cell: string
): T | null => {
  const normalized = cell
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return values.includes(normalized as T) ? (normalized as T) : null;
};

// ── Rows ────────────────────────────────────────────────────────────────────

interface HeaderMap {
  columns: Map<number, ImportColumn>;
  details: Map<number, string>;
  unknown: string[];
}

const readHeader = (header: string[]): HeaderMap => {
  const columns = new Map<number, ImportColumn>();
  const details = new Map<number, string>();
  const unknown: string[] = [];
  header.forEach((cell, index) => {
    const raw = cell.trim();
    if (raw.toLowerCase().startsWith(DETAILS_PREFIX)) {
      const key = raw.slice(DETAILS_PREFIX.length).trim();
      if (key) {
        details.set(index, key);
        return;
      }
    }
    const name = normalizeHeader(raw);
    const column = (IMPORT_COLUMNS as readonly string[]).includes(name)
      ? (name as ImportColumn)
      : COLUMN_ALIASES[name];
    if (column) {
      columns.set(index, column);
    } else if (raw) {
      unknown.push(raw);
    }
  });
  return { columns, details, unknown };
};

const setText = (
  fields: ImportFields,
  errors: RowError[],
  field: "description_ar" | "description_en" | "name_ar" | "name_en",
  value: string,
  max: number
) => {
  if (value.length > max) {
    errors.push({ code: "tooLong", column: field });
  } else {
    fields[field] = value;
  }
};

type Cell = (column: ImportColumn) => string;

const TEXT_FIELDS = [
  ["name_en", MAX_NAME],
  ["name_ar", MAX_NAME],
  ["description_en", MAX_DESCRIPTION],
  ["description_ar", MAX_DESCRIPTION],
] as const;

const ENUM_FIELDS = [
  ["kind", Enums.product_kind, "invalidKind"],
  ["status", Enums.product_status, "invalidStatus"],
  ["condition", Enums.product_condition, "invalidCondition"],
] as const;

const NUMBER_FIELDS = [
  ["price", "price", "invalidPrice", Number.MAX_SAFE_INTEGER],
  [
    "compare_at_price",
    "compare_at_price",
    "invalidCompareAt",
    Number.MAX_SAFE_INTEGER,
  ],
  ["stock", "stock_count", "invalidStock", MAX_STOCK],
] as const;

const parseSlug = (cell: Cell, errors: RowError[]) => {
  let slug = cell("slug").toLowerCase();
  if (slug && !(SLUG.test(slug) && slug.length <= MAX_SLUG)) {
    errors.push({ code: "invalidSlug", column: "slug" });
  }
  if (!slug && cell("name_en")) {
    slug = slugify(cell("name_en"));
  }
  if (!slug) {
    errors.push({ code: "missingSlug", column: "slug" });
  }
  return slug;
};

const parseChoices = (
  cell: Cell,
  fields: ImportFields,
  errors: RowError[],
  categories: ReadonlySet<string>
) => {
  for (const [column, values, code] of ENUM_FIELDS) {
    if (!cell(column)) {
      continue;
    }
    const value = enumValue<string>(values, cell(column));
    if (value) {
      (fields as Record<string, unknown>)[column] = value;
    } else {
      errors.push({ code, column });
    }
  }
  const category = cell("category").toLowerCase();
  if (!category) {
    return;
  }
  if (categories.has(category)) {
    fields.category = category;
  } else {
    errors.push({ code: "unknownCategory", column: "category" });
  }
};

const parseNumbers = (cell: Cell, fields: ImportFields, errors: RowError[]) => {
  for (const [column, field, code, max] of NUMBER_FIELDS) {
    if (!cell(column)) {
      continue;
    }
    const value = parseWholeNumber(cell(column));
    if (value === null || value > max) {
      errors.push({ code, column });
    } else {
      fields[field] = value;
    }
  }
};

const parseImages = (cell: Cell, fields: ImportFields, errors: RowError[]) => {
  const images = cell("image_urls")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  if (images.length === 0) {
    return;
  }
  if (images.length > MAX_IMAGES) {
    errors.push({ code: "tooManyImages", column: "image_urls" });
  } else if (images.some((image) => !isCatalogImage(image))) {
    errors.push({ code: "invalidImage", column: "image_urls" });
  } else {
    fields.images = images;
  }
};

const parseSpecs = (
  cell: Cell,
  details: Record<string, string>,
  fields: ImportFields,
  errors: RowError[],
  /** A variant row keeps its barcode and SKU on the variant. */
  variantRow: boolean
) => {
  const specs: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    ...details,
    ...(variantRow
      ? {}
      : { [BARCODE_DETAIL]: cell("barcode"), [SKU_DETAIL]: cell("sku") }),
  })) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.length > MAX_DETAIL || key.length > 100) {
      errors.push({ code: "tooLong", column: key });
    } else {
      specs[key] = trimmed;
    }
  }
  if (Object.keys(specs).length > 0) {
    fields.details = specs;
  }
};

/**
 * A row naming a version (`variant_en`): its label, format, price, stock,
 * SKU, barcode and pictures become the variant's, taken off the product.
 */
const parseVariant = (
  cell: Cell,
  fields: ImportFields,
  errors: RowError[]
): ImportVariant | undefined => {
  const labelEn = cell("variant_en");
  if (!labelEn) {
    return undefined;
  }
  const labelAr = cell("variant_ar");
  if (
    labelEn.length > MAX_VARIANT_LABEL ||
    labelAr.length > MAX_VARIANT_LABEL
  ) {
    errors.push({ code: "tooLong", column: "variant_en" });
  }
  const variant: ImportVariant = { label_en: labelEn };
  if (labelAr) {
    variant.label_ar = labelAr;
  }
  if (cell("format")) {
    variant.attributes = { Format: cell("format") };
  }
  for (const key of ["barcode", "sku"] as const) {
    if (cell(key)) {
      variant[key] = cell(key);
    }
  }
  for (const key of [
    "price",
    "compare_at_price",
    "stock_count",
    "images",
  ] as const) {
    if (fields[key] !== undefined) {
      (variant as unknown as Record<string, unknown>)[key] = fields[key];
      delete fields[key];
    }
  }
  return variant;
};

/** Validates one row's cells (by column) into fields and errors. */
export const parseRow = (
  cells: Partial<Record<ImportColumn, string>>,
  details: Record<string, string>,
  line: number,
  categories: ReadonlySet<string>
): ParsedRow => {
  const fields: ImportFields = {};
  const errors: RowError[] = [];
  const cell: Cell = (column) => cells[column]?.trim() ?? "";

  for (const [field, max] of TEXT_FIELDS) {
    if (cell(field)) {
      setText(fields, errors, field, cell(field), max);
    }
  }
  const slug = parseSlug(cell, errors);
  parseChoices(cell, fields, errors, categories);
  parseNumbers(cell, fields, errors);
  parseImages(cell, fields, errors);
  const variant = parseVariant(cell, fields, errors);
  parseSpecs(cell, details, fields, errors, variant !== undefined);

  return variant
    ? { errors, fields, line, slug, variant }
    : { errors, fields, line, slug };
};

/** Reads a whole CSV export into validated rows. */
export const parseSheet = (
  text: string,
  categories: ReadonlySet<string>
): ParsedSheet => {
  const [header, ...body] = parseCsv(text);
  if (!header) {
    return { problem: "empty", rows: [], unknownColumns: [] };
  }
  const map = readHeader(header);
  const known = new Set(map.columns.values());
  if (!(known.has("slug") || known.has("name_en"))) {
    return { problem: "noNameOrSlug", rows: [], unknownColumns: map.unknown };
  }

  const rows: ParsedRow[] = [];
  body.forEach((cells, index) => {
    if (cells.every((value) => value.trim() === "")) {
      return;
    }
    const byColumn: Partial<Record<ImportColumn, string>> = {};
    const details: Record<string, string> = {};
    cells.forEach((value, position) => {
      const column = map.columns.get(position);
      if (column) {
        byColumn[column] = value;
      }
      const key = map.details.get(position);
      if (key) {
        details[key] = value;
      }
    });
    rows.push(parseRow(byColumn, details, index + 2, categories));
  });

  const grouped = groupVariants(rows);
  return {
    problem: grouped.length === 0 ? "empty" : undefined,
    rows: grouped,
    unknownColumns: map.unknown,
  };
};

/** Rows by slug, in sheet order (rows without a slug stay on their own). */
const rowsBySlug = (rows: readonly ParsedRow[]) => {
  const groups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const key = row.slug || `#${row.line}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()];
};

/** Why a group of rows can't be one product, if it can't. */
const groupProblem = (group: readonly ParsedRow[]): RowErrorCode | null => {
  if (group.length < 2) {
    return null;
  }
  const labels = group.map((row) => row.variant?.label_en.toLowerCase());
  if (labels.some((label) => label === undefined)) {
    return "duplicateSlug";
  }
  return new Set(labels).size < labels.length ? "duplicateVariant" : null;
};

/** One product from its version rows: the first row's fields, then any the others add. */
const mergeVersions = (group: readonly ParsedRow[]): ParsedRow => {
  const [first] = group as [ParsedRow, ...ParsedRow[]];
  const fields: ImportFields = {};
  for (const row of group) {
    for (const [key, value] of Object.entries(row.fields)) {
      (fields as Record<string, unknown>)[key] ??= value;
    }
  }
  fields.variants = group.flatMap((row) => (row.variant ? [row.variant] : []));
  const errors = group.flatMap((row) => row.errors);
  if (fields.variants.length > MAX_VARIANTS) {
    errors.push({ code: "tooManyVariants", column: "variant_en" });
  }
  return { errors, fields, line: first.line, slug: first.slug };
};

/**
 * Merges rows that share a slug into one product when every one names a
 * different version; any other repeated slug is an error on each row.
 */
export const groupVariants = (rows: readonly ParsedRow[]): ParsedRow[] =>
  rowsBySlug(rows).flatMap((group) => {
    const problem = groupProblem(group);
    if (problem) {
      for (const row of group) {
        row.errors.push({
          code: problem,
          column: problem === "duplicateSlug" ? "slug" : "variant_en",
        });
      }
      return group;
    }
    return group[0]?.variant ? [mergeVersions(group)] : group;
  });

// ── Diff ────────────────────────────────────────────────────────────────────

const asDetails = (value: Json | undefined): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const sameImages = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const SCALAR_FIELDS = [
  "kind",
  "status",
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "price",
  "compare_at_price",
  "condition",
  "stock_count",
] as const;

/** A new product needs both names and a price; compare-at stays above it. */
const mergedErrors = (
  fields: ImportFields,
  existing: ExistingProduct | undefined
): RowError[] => {
  const errors: RowError[] = [];
  if (!existing) {
    for (const field of ["name_en", "name_ar"] as const) {
      if (fields[field] === undefined) {
        errors.push({ code: "missingForNew", column: field });
      }
    }
    // A new product's price is its own, or each new version's.
    const priced = fields.variants
      ? fields.variants.every((variant) => variant.price !== undefined)
      : fields.price !== undefined;
    if (!priced) {
      errors.push({ code: "missingForNew", column: "price" });
    }
  }
  for (const variant of fields.variants ?? []) {
    if (
      variant.compare_at_price !== undefined &&
      variant.price !== undefined &&
      variant.compare_at_price <= variant.price
    ) {
      errors.push({ code: "compareAtNotHigher", column: "compare_at_price" });
    }
  }
  const price = fields.price ?? existing?.price;
  const compareAt = fields.compare_at_price ?? existing?.compare_at_price;
  if (
    compareAt !== null &&
    compareAt !== undefined &&
    price !== undefined &&
    compareAt <= price
  ) {
    errors.push({ code: "compareAtNotHigher", column: "compare_at_price" });
  }
  return errors;
};

/** The fields that differ from the stored product, and the item to send. */
const changes = (
  slug: string,
  fields: ImportFields,
  existing: ExistingProduct,
  categoryIds: ReadonlyMap<string, string>
) => {
  const changed: ImportField[] = [];
  const item: ImportItem = { slug };
  for (const field of SCALAR_FIELDS) {
    const value = fields[field];
    if (value !== undefined && value !== existing[field]) {
      changed.push(field);
      (item as unknown as Record<string, unknown>)[field] = value;
    }
  }
  if (
    fields.category !== undefined &&
    categoryIds.get(fields.category) !== existing.category_id
  ) {
    changed.push("category");
    item.category = fields.category;
  }
  if (fields.images && !sameImages(fields.images, existing.images)) {
    changed.push("images");
    item.images = fields.images;
  }
  const stored = asDetails(existing.details);
  const differing = Object.entries(fields.details ?? {}).filter(
    ([key, value]) => stored[key] !== value
  );
  if (differing.length > 0) {
    changed.push("details");
    item.details = Object.fromEntries(differing);
  }
  // Versions are upserted by label (the database keeps what's unchanged).
  if (fields.variants) {
    changed.push("variants");
    item.variants = fields.variants;
  }
  return { changed, item };
};

/**
 * Compares a valid row with the stored product (none for a new one): the
 * fields that differ, and the item to send.
 */
export const diffRow = (
  row: ParsedRow,
  existing: ExistingProduct | undefined,
  categoryIds: ReadonlyMap<string, string>
): PreviewRow => {
  const { fields, line, slug } = row;
  const errors =
    row.errors.length > 0 ? row.errors : mergedErrors(fields, existing);
  if (errors.length > 0) {
    return { errors, line, slug, status: "error" };
  }
  if (!existing) {
    return { fields, item: { slug, ...fields }, line, slug, status: "new" };
  }
  const { changed, item } = changes(slug, fields, existing, categoryIds);
  return changed.length > 0
    ? { changed, fields, item, line, slug, status: "changed" }
    : { line, slug, status: "unchanged" };
};

/** Every row of a sheet compared with the catalog. */
export const buildPreview = (
  rows: ParsedRow[],
  existing: readonly ExistingProduct[],
  categories: readonly Category[]
): PreviewRow[] => {
  const bySlug = new Map(existing.map((product) => [product.slug, product]));
  const categoryIds = new Map(
    categories.map((category) => [category.slug, category.id])
  );
  return rows.map((row) => diffRow(row, bySlug.get(row.slug), categoryIds));
};

/** The items to send for the new and changed rows. */
export const importItems = (preview: readonly PreviewRow[]): ImportItem[] =>
  preview.flatMap((row) =>
    row.status === "new" || row.status === "changed" ? [row.item] : []
  );

/** Splits a list into batches of at most `size`. */
export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
};
