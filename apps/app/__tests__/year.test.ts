import { describe, expect, it } from "vitest";
import { baghdadYear, earnedBulbs } from "@/lib/year";

describe("baghdadYear", () => {
  it("starts at midnight on 1 January in Baghdad", () => {
    expect(baghdadYear(new Date("2026-11-05T12:00:00Z"))).toEqual({
      start: "2025-12-31T21:00:00.000Z",
      year: 2026,
    });
  });

  it("is already the new year in Baghdad before it is in UTC", () => {
    expect(baghdadYear(new Date("2026-12-31T22:00:00Z")).year).toBe(2027);
  });
});

describe("earnedBulbs", () => {
  it("adds only available purchases and bonuses", () => {
    expect(
      earnedBulbs([
        { amount: 500, kind: "purchase", status: "available" },
        { amount: 100, kind: "bonus", status: "available" },
        { amount: 300, kind: "purchase", status: "pending" },
        { amount: -200, kind: "redemption", status: "available" },
        { amount: 50, kind: "adjustment", status: "available" },
      ])
    ).toBe(600);
  });
});
