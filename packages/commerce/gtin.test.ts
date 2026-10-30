import { describe, expect, test } from "vitest";
import { isbn10To13, isGtin, normalizeGtin } from "./gtin";

describe("GTIN", () => {
  test("checks the digit of EAN-13, UPC-A and EAN-8", () => {
    expect(isGtin("9780061122415")).toBe(true);
    expect(isGtin("9780061122416")).toBe(false);
    expect(isGtin("036000291452")).toBe(true);
    expect(isGtin("96385074")).toBe(true);
    expect(isGtin("12345")).toBe(false);
  });

  test("turns an ISBN-10 into ISBN-13", () => {
    expect(isbn10To13("0061122416")).toBe("9780061122415");
    expect(normalizeGtin("0-06-112241-6")).toBe("9780061122415");
    expect(normalizeGtin("080442957X")).toBe("9780804429573");
  });

  test("drops spaces and dashes, and refuses what isn't a GTIN", () => {
    expect(normalizeGtin("978-0-06-112241-5")).toBe("9780061122415");
    expect(normalizeGtin("not a code")).toBeNull();
    expect(normalizeGtin("9780061122410")).toBeNull();
  });
});
