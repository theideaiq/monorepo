import { describe, expect, it } from "vitest";
import {
  applicationsPath,
  byDateOrDeadline,
  eventPath,
  isJoinFilter,
  isPostTopic,
  isThisWeek,
  joinPath,
  postPath,
  receiptPath,
  topicPath,
} from "@/lib/club";

describe("The Club", () => {
  it("links each part and filter", () => {
    expect(joinPath()).toBe("/club");
    expect(joinPath("surveys")).toBe("/club/surveys");
    expect(topicPath()).toBe("/club/read");
    expect(topicPath("guides")).toBe("/club/read?topic=guides");
    expect(postPath("our story")).toBe("/club/read/our%20story");
    expect(eventPath("quiz-night")).toBe("/club/events/quiz-night");
    expect(applicationsPath()).toBe("/pass/applications");
    expect(applicationsPath("surveys")).toBe("/pass/applications?tab=surveys");
    expect(receiptPath("a b")).toBe("/pass/orders/a%20b");
  });

  it("knows its filters and topics", () => {
    expect(isJoinFilter("events")).toBe(true);
    expect(isJoinFilter("news")).toBe(false);
    expect(isPostTopic("stories")).toBe(true);
    expect(isPostTopic("events")).toBe(false);
  });

  it("knows what happens this week", () => {
    const now = new Date("2027-03-01T12:00:00Z");
    expect(isThisWeek("2027-03-03T18:00:00Z", now)).toBe(true);
    expect(isThisWeek("2027-03-09T18:00:00Z", now)).toBe(false);
    expect(isThisWeek("2027-02-28T18:00:00Z", now)).toBe(false);
    expect(isThisWeek(null, now)).toBe(false);
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
