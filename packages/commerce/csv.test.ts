import { describe, expect, test } from "vitest";
import { csvCell, parseCsv, parseWholeNumber } from "./csv";

describe("parseCsv", () => {
  test("reads quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","two\nlines"\r\n')).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "two\nlines"],
    ]);
  });

  test("reads tab-separated text pasted from a spreadsheet", () => {
    expect(parseCsv("slug\tprice\nps5\t700000")).toEqual([
      ["slug", "price"],
      ["ps5", "700000"],
    ]);
  });

  test("keeps empty trailing cells", () => {
    expect(parseCsv("a,b,\n1,,")).toEqual([
      ["a", "b", ""],
      ["1", "", ""],
    ]);
  });
});

describe("cells", () => {
  test("parseWholeNumber reads grouped, Arabic-Indic and decimal-zero numbers", () => {
    expect(parseWholeNumber("64,750")).toBe(64_750);
    expect(parseWholeNumber("٦٤٬٧٥٠")).toBe(64_750);
    expect(parseWholeNumber("64750.00")).toBe(64_750);
    expect(parseWholeNumber("12.5")).toBeNull();
    expect(parseWholeNumber("-3")).toBeNull();
    expect(parseWholeNumber("abc")).toBeNull();
  });

  test("csvCell quotes cells that need it", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
  });
});
