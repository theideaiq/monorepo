import { describe, expect, it } from "vitest";
import { plansByTier, requiredPlan } from "@/lib/plus";
import { formatRating, ratingsById, starFills } from "@/lib/reviews";

describe("ratings", () => {
  it("keys ratings by product and drops unreviewed rows", () => {
    expect(
      ratingsById([
        { average: "4.5", count: 2, product_id: "a" },
        { average: 3, count: 1, product_id: "b" },
        { average: null, count: 0, product_id: "c" },
        { average: 4, count: 3, product_id: null },
      ])
    ).toEqual({
      a: { average: 4.5, count: 2 },
      b: { average: 3, count: 1 },
    });
  });

  it("formats averages with one decimal in Latin digits", () => {
    expect(formatRating(4.5, "en")).toBe("4.5");
    expect(formatRating(4, "en")).toBe("4.0");
    expect(["3.7", "3٫7", "3,7"]).toContain(formatRating(3.7, "ar"));
  });

  it("fills stars up to the average", () => {
    expect(starFills(3.5)).toEqual([1, 1, 1, 0.5, 0]);
    expect(starFills(5)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(0)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("Plus tiers", () => {
  const plans = [
    { name: "Premium", tier: 3 },
    { name: "Essential", tier: 1 },
    { name: "Extra", tier: 2 },
  ];

  it("orders plans from the entry plan up", () => {
    expect(plansByTier(plans).map((plan) => plan.name)).toEqual([
      "Essential",
      "Extra",
      "Premium",
    ]);
  });

  it("names the lowest plan that reaches an item's tier", () => {
    expect(requiredPlan(plans, 2)?.name).toBe("Extra");
    expect(requiredPlan(plans, 3)?.name).toBe("Premium");
    expect(
      requiredPlan(
        [
          { name: "A", tier: 1 },
          { name: "C", tier: 4 },
        ],
        2
      )?.name
    ).toBe("C");
  });

  it("marks nothing when every plan can rent the item", () => {
    expect(requiredPlan(plans, null)).toBeNull();
    expect(requiredPlan(plans, 1)).toBeNull();
    expect(requiredPlan(plans, 9)).toBeNull();
    expect(requiredPlan([], 2)).toBeNull();
  });
});
