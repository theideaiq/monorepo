import { describe, expect, test } from "vitest";
import { costSummary, costsOf, itineraryOf, onTopKind } from "./program-costs";

const flights = {
  amount: 1_250_000,
  included: true,
  label_ar: "الطيران",
  label_en: "Flights",
};
const visa = {
  amount: 150_000,
  included: false,
  label_ar: "الفيزا",
  label_en: "Visa",
};
const meals = {
  amount: null,
  included: false,
  label_ar: "الأكل",
  label_en: "Meals",
};
const pocket = { included: false, label_ar: "مصرف", label_en: "Pocket money" };

describe("program cost summary", () => {
  test("missing or malformed columns read as no costs", () => {
    for (const value of [undefined, null, {}, "x", [1, { label_en: "x" }]]) {
      expect(costSummary(value)).toEqual({
        extras: [],
        included: [],
        knownExtra: 0,
        someUnknown: false,
      });
    }
  });

  test("splits included from extra and adds up the known extras", () => {
    const summary = costSummary([flights, visa, { ...visa, amount: 50_000 }]);
    expect(summary.included).toEqual([flights]);
    expect(summary.extras).toHaveLength(2);
    expect(summary.knownExtra).toBe(200_000);
    expect(summary.someUnknown).toBe(false);
  });

  test("an extra without an amount makes the total a minimum", () => {
    const summary = costSummary([visa, meals, pocket]);
    expect(summary.knownExtra).toBe(150_000);
    expect(summary.someUnknown).toBe(true);
  });

  test("only unknown extras", () => {
    const summary = costSummary([flights, meals]);
    expect(summary.knownExtra).toBe(0);
    expect(summary.someUnknown).toBe(true);
  });

  test("included amounts never count on top", () => {
    expect(costSummary([flights]).knownExtra).toBe(0);
    expect(costsOf([flights])).toEqual([flights]);
  });
});

describe("program itinerary", () => {
  test("sorts by day and reads anything else as none", () => {
    const one = { day: 1, title_ar: "الوصول", title_en: "Arrive" };
    const two = {
      day: 2,
      detail_en: "Tour",
      title_ar: "جولة",
      title_en: "Tour",
    };
    expect(itineraryOf([two, one])).toEqual([one, two]);
    expect(itineraryOf(undefined)).toEqual([]);
    expect(itineraryOf([{ title_en: "x" }])).toEqual([]);
  });
});

describe("what's paid on top", () => {
  test("none, exact, at least, or only varies", () => {
    expect(onTopKind(costSummary([flights]))).toBe("none");
    expect(onTopKind(costSummary(undefined))).toBe("none");
    expect(onTopKind(costSummary([flights, visa]))).toBe("exact");
    expect(onTopKind(costSummary([visa, meals]))).toBe("atLeast");
    expect(onTopKind(costSummary([meals, pocket]))).toBe("varies");
  });
});
