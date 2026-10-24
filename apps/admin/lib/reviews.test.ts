import { describe, expect, test } from "vitest";
import { ratingSummary, reviewStatusSchema, stars } from "./reviews";

describe("reviews", () => {
  test("rating summary counts published reviews only", () => {
    const summary = ratingSummary([
      { rating: 5, status: "published" },
      { rating: 4, status: "published" },
      { rating: 4, status: "published" },
      { rating: 1, status: "hidden" },
    ]);
    expect(summary.average).toBe(4.3);
    expect(summary.published).toBe(3);
    expect(summary.hidden).toBe(1);
    expect(summary.byRating.find((row) => row.rating === 4)).toEqual({
      count: 2,
      rating: 4,
      share: 2 / 3,
    });
    expect(summary.byRating.find((row) => row.rating === 1)?.count).toBe(0);
  });

  test("no published reviews, no average", () => {
    expect(ratingSummary([{ rating: 2, status: "hidden" }]).average).toBeNull();
    expect(ratingSummary([]).byRating.every((row) => row.share === 0)).toBe(
      true
    );
  });

  test("stars", () => {
    expect(stars(4)).toBe("★★★★☆");
    expect(stars(0)).toBe("☆☆☆☆☆");
    expect(stars(7)).toBe("★★★★★");
  });

  test("moderation only publishes or hides", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(reviewStatusSchema.safeParse({ id, status: "hidden" }).success).toBe(
      true
    );
    expect(
      reviewStatusSchema.safeParse({ id, status: "deleted" }).success
    ).toBe(false);
  });
});
