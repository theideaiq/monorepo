import { csvCell, parseCsv, parseWholeNumber } from "@repo/commerce/csv";
import type { Database } from "@repo/database";
import { MAX_QUANTITY, MIN_PRICE } from "./listing-queries";

/**
 * Partners → Selling → Listings → Upload a spreadsheet: reads a CSV (or
 * text pasted from a spreadsheet) in the browser and checks every row
 * before anything is sent. Each row is one offer: the barcode finds the
 * product; a barcode nobody has listed needs the names and category to
 * create it. The database checks everything again.
 */

type Condition = Database["public"]["Enums"]["product_condition"];

/** The sheet's columns, in template order. */
export const UPLOAD_COLUMNS = [
  "barcode",
  "condition",
  "price",
  "quantity",
  "sku",
  "name_en",
  "name_ar",
  "category",
] as const;

type UploadColumn = (typeof UPLOAD_COLUMNS)[number];

/** Other spellings accepted in the header row. */
const COLUMN_ALIASES: Record<string, UploadColumn> = {
  copies: "quantity",
  ean: "barcode",
  isbn: "barcode",
  name: "name_en",
  qty: "quantity",
  stock: "quantity",
  upc: "barcode",
};

/** Rows in one file. */
export const MAX_UPLOAD_ROWS = 500;
const MAX_NAME = 200;
const MAX_SKU = 64;

const CONDITION_NAMES: Record<string, Condition> = {
  new: "new",
  open_box: "open_box",
  openbox: "open_box",
  refurbished: "refurbished",
  used: "used",
};

/** Message keys under `app.company.listings.upload.errors`. */
export type UploadErrorCode =
  | "duplicate"
  | "invalidCondition"
  | "invalidPrice"
  | "invalidQuantity"
  | "missingBarcode"
  | "tooLong"
  | "unknownCategory";

export interface UploadRow {
  barcode: string;
  condition: Condition;
  errors: UploadErrorCode[];
  /** Line in the file (the header is line 1). */
  line: number;
  price: number;
  /** What a new product needs, when the row gives all of it. */
  product?: { categorySlug: string; nameAr: string; nameEn: string };
  quantity: number;
  sku: string;
}

export type UploadProblem = "empty" | "missingColumns" | "tooManyRows";

export interface UploadSheet {
  problem?: UploadProblem;
  rows: UploadRow[];
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const columnOf = (header: string): UploadColumn | null => {
  const name = normalizeHeader(header);
  if ((UPLOAD_COLUMNS as readonly string[]).includes(name)) {
    return name as UploadColumn;
  }
  return COLUMN_ALIASES[name] ?? null;
};

const NON_DIGITS = /[^\dXx]/g;

/** One row's cells, read and checked. */
const readRow = (
  cell: (column: UploadColumn) => string,
  line: number,
  categories: ReadonlySet<string>
): UploadRow => {
  const errors: UploadErrorCode[] = [];
  const barcode = cell("barcode").replace(NON_DIGITS, "");
  if (barcode === "") {
    errors.push("missingBarcode");
  }

  const conditionCell = normalizeHeader(cell("condition"));
  const condition =
    conditionCell === "" ? "new" : CONDITION_NAMES[conditionCell];
  if (!condition) {
    errors.push("invalidCondition");
  }

  const price = parseWholeNumber(cell("price"));
  if (price === null || price < MIN_PRICE) {
    errors.push("invalidPrice");
  }
  const quantity = parseWholeNumber(cell("quantity"));
  if (quantity === null || quantity > MAX_QUANTITY) {
    errors.push("invalidQuantity");
  }

  const sku = cell("sku");
  const nameEn = cell("name_en");
  const nameAr = cell("name_ar");
  if (
    sku.length > MAX_SKU ||
    nameEn.length > MAX_NAME ||
    nameAr.length > MAX_NAME
  ) {
    errors.push("tooLong");
  }
  const categorySlug = cell("category").toLowerCase();
  if (categorySlug !== "" && !categories.has(categorySlug)) {
    errors.push("unknownCategory");
  }

  return {
    barcode,
    condition: condition ?? "new",
    errors,
    line,
    price: price ?? 0,
    product:
      nameEn && nameAr && categorySlug
        ? { categorySlug, nameAr, nameEn }
        : undefined,
    quantity: quantity ?? 0,
    sku,
  };
};

/**
 * Reads a whole file into checked rows. `categories` holds the category
 * slugs a new product may use. Blank lines are skipped; a barcode and
 * condition listed twice is an error on the later row.
 */
export const parseUpload = (
  text: string,
  categories: ReadonlySet<string>
): UploadSheet => {
  const [header, ...body] = parseCsv(text);
  if (!header) {
    return { problem: "empty", rows: [] };
  }
  const columns = header.map(columnOf);
  if (
    !(["barcode", "price", "quantity"] as const).every((column) =>
      columns.includes(column)
    )
  ) {
    return { problem: "missingColumns", rows: [] };
  }

  const lines = body
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => cells.some((value) => value.trim() !== ""));
  if (lines.length === 0) {
    return { problem: "empty", rows: [] };
  }
  if (lines.length > MAX_UPLOAD_ROWS) {
    return { problem: "tooManyRows", rows: [] };
  }

  const seen = new Set<string>();
  const rows = lines.map(({ cells, line }) => {
    const cell = (column: UploadColumn) => {
      const index = columns.indexOf(column);
      return index === -1 ? "" : (cells[index] ?? "").trim();
    };
    const row = readRow(cell, line, categories);
    if (row.barcode === "" || row.errors.includes("invalidCondition")) {
      return row;
    }
    const key = `${row.barcode}|${row.condition}`;
    if (seen.has(key)) {
      row.errors.push("duplicate");
    }
    seen.add(key);
    return row;
  });
  return { rows };
};

/** The downloadable template: the header and two example rows. */
export const uploadTemplateCsv = () =>
  `﻿${[
    UPLOAD_COLUMNS.join(","),
    ["9780441172719", "new", "14750", "3", "DUNE-01", "", "", ""],
    [
      "9786140100000",
      "used",
      "9750",
      "1",
      "",
      "A book nobody has listed",
      "كتاب لم يعرضه أحد",
      "books",
    ],
  ]
    .map((row) => (typeof row === "string" ? row : row.map(csvCell).join(",")))
    .join("\r\n")}\r\n`;
