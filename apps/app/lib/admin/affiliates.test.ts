import { describe, expect, test } from "vitest";
import { AFFILIATE_CODE, suggestCode } from "./affiliates";

describe("affiliate codes", () => {
  test("suggests a code from the first name", () => {
    expect(suggestCode("Ali Hassan")).toBe("ALIIDEA");
    expect(suggestCode("Zainab Ahmed")).toBe("ZAINAB");
    expect(suggestCode("زينب")).toBe("IDEA");
    expect(suggestCode(null)).toBe("IDEA");
  });

  test("suggestions are valid codes", () => {
    for (const name of ["Ali", "Mohammed Kareem", "زينب", "Jo-Anne"]) {
      expect(AFFILIATE_CODE.test(suggestCode(name))).toBe(true);
    }
  });
});
