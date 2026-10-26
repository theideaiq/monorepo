import { describe, expect, test } from "vitest";
import {
  isUuid,
  oneOf,
  pageCount,
  pageRange,
  param,
  searchTerm,
  withParams,
} from "./list";

describe("list helpers", () => {
  test("pages", () => {
    expect(pageRange({})).toEqual({ from: 0, page: 1, size: 25, to: 24 });
    expect(pageRange({ page: "3" })).toEqual({
      from: 50,
      page: 3,
      size: 25,
      to: 74,
    });
    expect(pageRange({ page: "-1" }).page).toBe(1);
    expect(pageRange({ page: "abc" }).page).toBe(1);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(51)).toBe(3);
  });

  test("parameters", () => {
    expect(param({ q: [" a ", "b"] }, "q")).toBe("a");
    expect(oneOf({ status: "paid" }, "status", ["paid", "pending"])).toBe(
      "paid"
    );
    expect(oneOf({ status: "x" }, "status", ["paid"])).toBeNull();
    expect(withParams({ page: "2", q: "ali" }, { page: null })).toBe("?q=ali");
    expect(withParams({}, { page: 2 })).toBe("?page=2");
  });

  test("search terms can't inject filters", () => {
    expect(searchTerm("100%_off,(x)")).toBe("100  off  x");
    expect(isUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
});
