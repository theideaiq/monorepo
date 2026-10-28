import { describe, expect, it } from "vitest";
import {
  byDateOrDeadline,
  isJoinFilter,
  isPostTopic,
  joinPath,
  receiptPath,
  topicPath,
} from "@/lib/club";

describe("The Club", () => {
  it("links each part and filter", () => {
    expect(joinPath()).toBe("/club#join");
    expect(joinPath("surveys")).toBe("/club?show=surveys#join");
    expect(topicPath()).toBe("/club#read");
    expect(topicPath("guides")).toBe("/club?topic=guides#read");
    expect(receiptPath("a b")).toBe("/pass/orders/a%20b");
  });

  it("knows its filters and topics", () => {
    expect(isJoinFilter("events")).toBe(true);
    expect(isJoinFilter("news")).toBe(false);
    expect(isPostTopic("stories")).toBe(true);
    expect(isPostTopic("events")).toBe(false);
  });

  it("puts the soonest date or deadline first and open-ended ones last", () => {
    const items = byDateOrDeadline([
      { at: null, key: "survey-open" },
      { at: "2027-03-01T18:00:00Z", key: "event-b" },
      { at: "2027-02-01T09:00:00Z", key: "survey-closing" },
      { at: "2027-03-01T18:00:00Z", key: "event-a" },
    ]);
    expect(items.map((item) => item.key)).toEqual([
      "survey-closing",
      "event-a",
      "event-b",
      "survey-open",
    ]);
  });
});
