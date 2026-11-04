import { describe, expect, it } from "vitest";
import { countryCodes } from "./forms";

describe("countryCodes", () => {
  it("upper-cases, trims and de-duplicates", () => {
    expect(countryCodes.parse(" de, tr,DE،iq ")).toEqual(["DE", "TR", "IQ"]);
  });

  it("is empty when nothing is entered", () => {
    expect(countryCodes.parse("")).toEqual([]);
    expect(countryCodes.parse(undefined)).toEqual([]);
  });

  it("refuses anything but two-letter codes", () => {
    expect(countryCodes.safeParse("Germany").success).toBe(false);
    expect(countryCodes.safeParse("D1").success).toBe(false);
  });
});
