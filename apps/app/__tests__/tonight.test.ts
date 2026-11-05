import { describe, expect, it } from "vitest";
import { baghdadDayNumber, pickOfTheDay } from "@/lib/tonight";

const items = [{ id: "c" }, { id: "a" }, { id: "b" }];

describe("pickOfTheDay", () => {
  it("is nothing without items", () => {
    expect(pickOfTheDay([], new Date())).toBeNull();
  });

  it("is the same all day in Baghdad and moves on the next day", () => {
    // 00:30 and 23:30 on 5 November in Baghdad (UTC+3).
    const morning = new Date("2026-11-04T21:30:00Z");
    const night = new Date("2026-11-05T20:30:00Z");
    expect(baghdadDayNumber(morning)).toBe(baghdadDayNumber(night));
    expect(pickOfTheDay(items, morning)).toEqual(pickOfTheDay(items, night));
    const tomorrow = new Date("2026-11-05T21:30:00Z");
    expect(pickOfTheDay(items, tomorrow)).not.toEqual(
      pickOfTheDay(items, night)
    );
  });

  it("doesn't depend on the order the items came in", () => {
    const day = new Date("2026-11-05T12:00:00Z");
    expect(pickOfTheDay(items, day)).toEqual(
      pickOfTheDay([...items].reverse(), day)
    );
  });
});
