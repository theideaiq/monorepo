import { describe, expect, test } from "vitest";
import {
  costsOf,
  itineraryOf,
  validCosts,
  validItinerary,
} from "./program-package";

describe("program itinerary", () => {
  test("drops blank rows, trims and sorts by day", () => {
    const steps = itineraryOf({
      day: ["2", "", "1"],
      detailAr: ["", "", " وصول "],
      detailEn: ["", "", "Arrival"],
      titleAr: ["الجامعة", "", "الوصول"],
      titleEn: ["Campus", "", "Arrive"],
    });
    expect(steps).toEqual([
      {
        day: 1,
        detail_ar: "وصول",
        detail_en: "Arrival",
        title_ar: "الوصول",
        title_en: "Arrive",
      },
      { day: 2, title_ar: "الجامعة", title_en: "Campus" },
    ]);
    expect(validItinerary(steps)).toBe(true);
  });

  test("no rows is an empty itinerary", () => {
    expect(itineraryOf({})).toEqual([]);
    expect(validItinerary([])).toBe(true);
  });

  test("rejects what the database rejects", () => {
    const step = { day: 1, title_ar: "أ", title_en: "A" };
    expect(validItinerary([{ ...step, day: 0 }])).toBe(false);
    expect(validItinerary([{ ...step, day: 366 }])).toBe(false);
    expect(validItinerary([{ ...step, day: 1.5 }])).toBe(false);
    expect(
      validItinerary(
        itineraryOf({ day: ["x"], titleAr: ["أ"], titleEn: ["A"] })
      )
    ).toBe(false);
    expect(validItinerary([{ ...step, title_en: "" }])).toBe(false);
    expect(validItinerary([{ ...step, title_ar: "a".repeat(201) }])).toBe(
      false
    );
    expect(validItinerary([{ ...step, detail_en: "a".repeat(1001) }])).toBe(
      false
    );
    expect(validItinerary(Array.from({ length: 61 }, () => step))).toBe(false);
    expect(validItinerary(Array.from({ length: 60 }, () => step))).toBe(true);
  });
});

describe("program costs", () => {
  test("reads included, amounts and unknown amounts", () => {
    const lines = costsOf({
      amount: ["1,250,000", "", ""],
      included: ["yes", "no", "no"],
      labelAr: ["الطيران", "الفيزا", ""],
      labelEn: ["Flights", "Visa", ""],
    });
    expect(lines).toEqual([
      {
        amount: 1_250_000,
        included: true,
        label_ar: "الطيران",
        label_en: "Flights",
      },
      { amount: null, included: false, label_ar: "الفيزا", label_en: "Visa" },
    ]);
    expect(validCosts(lines)).toBe(true);
  });

  test("rejects what the database rejects", () => {
    const line = { amount: 250, included: false, label_ar: "أ", label_en: "A" };
    expect(validCosts([{ ...line, amount: 300 }])).toBe(false);
    expect(validCosts([{ ...line, amount: -250 }])).toBe(false);
    expect(
      validCosts(costsOf({ amount: ["abc"], labelAr: ["أ"], labelEn: ["A"] }))
    ).toBe(false);
    expect(validCosts([{ ...line, label_ar: "" }])).toBe(false);
    expect(validCosts([{ ...line, label_en: "a".repeat(201) }])).toBe(false);
    expect(validCosts(Array.from({ length: 41 }, () => line))).toBe(false);
    expect(validCosts([{ ...line, amount: 0 }])).toBe(true);
    expect(validCosts([])).toBe(true);
  });
});
