import { describe, expect, it } from "vitest";
import { boxPriceOk, boxPriceRange, boxValue, percentBelow } from "./boxes";

const starter = [
  { quantity: 1, variant: { price: 259_750 } },
  { quantity: 1, variant: { price: 24_750 } },
  { quantity: 3, variant: null },
];

describe("boxes", () => {
  it("adds the fixed parts to what the picks are worth", () => {
    expect(boxValue(starter, 150_000)).toBe(434_500);
    expect(boxValue([], 60_000)).toBe(60_000);
  });

  it("prices a box 10–15% below its parts", () => {
    expect(boxPriceRange(434_500)).toEqual({ max: 391_050, min: 369_325 });
    expect(boxPriceOk(379_750, 434_500)).toBe(true);
    expect(boxPriceOk(400_000, 434_500)).toBe(false);
    expect(boxPriceOk(360_000, 434_500)).toBe(false);
    expect(percentBelow(379_750, 434_500)).toBe(13);
    expect(percentBelow(1000, 0)).toBe(0);
  });
});
