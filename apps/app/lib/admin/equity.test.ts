import { describe, expect, test } from "vitest";
import { holderSchema, isConvertible } from "./equity";

const holder = { name: "Angel", shares: "0", type: "investor" };

describe("cap table holders", () => {
  test("SAFEs and notes keep investment, cap and discount", () => {
    expect(
      holderSchema.parse({
        ...holder,
        conversionCap: "5,000,000",
        discountRate: "20",
        instrument: "safe",
        investedAmount: "100000",
      })
    ).toMatchObject({
      conversionCap: 5_000_000,
      discountRate: 20,
      instrument: "safe",
      investedAmount: 100_000,
    });
  });

  test("a SAFE needs the amount invested", () => {
    const parsed = holderSchema.safeParse({
      ...holder,
      instrument: "convertible_note",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["investedAmount"]);
    expect(
      holderSchema.safeParse({
        ...holder,
        discountRate: "120",
        instrument: "safe",
        investedAmount: "1",
      }).success
    ).toBe(false);
  });

  test("shares drop the SAFE terms; common is the default", () => {
    const parsed = holderSchema.parse({
      ...holder,
      conversionCap: "1",
      investedAmount: "5",
      shares: "1,000",
    });
    expect(parsed).toMatchObject({
      conversionCap: null,
      discountRate: null,
      instrument: "common",
      investedAmount: null,
      shares: 1000,
    });
  });

  test("isConvertible", () => {
    expect(isConvertible("safe")).toBe(true);
    expect(isConvertible("convertible_note")).toBe(true);
    expect(isConvertible("preferred")).toBe(false);
  });
});
