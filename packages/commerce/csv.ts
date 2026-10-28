/**
 * Spreadsheet files read in the browser: Staff's catalog import and the
 * shops' listing upload in The IDEA Partners.
 */

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
export const csvCell = (value: string) =>
  CSV_SPECIAL.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const EASTERN_DIGITS = /[٠-٩۰-۹]/g;
const NUMBER_NOISE = /[\s,٬_]/g;
const WHOLE_NUMBER = /^\d+(?:\.0+)?$/;

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
