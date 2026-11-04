import { describe, expect, it } from "vitest";
import {
  applicationsPath,
  byDateOrDeadline,
  countryName,
  eventPath,
  isJoinFilter,
  isPostTopic,
  isThisWeek,
  joinPath,
  matchesOpportunityFilters,
  opportunityFilters,
  postPath,
  receiptPath,
  sourceHost,
  topicPath,
} from "@/lib/club";

type Filtered = Parameters<typeof matchesOpportunityFilters>[0];

describe("Opportunity filters", () => {
  const row: Filtered = {
    destination_countries: ["DE", "TR"],
    funding_type: "fully_funded",
    iraqi_eligibility: "named_official",
    kind: "scholarship",
    levels: ["masters", "phd"],
    max_age: 30,
    min_age: 18,
  };
  const none = opportunityFilters({});
  const unstated: Filtered = {
    destination_countries: [],
    funding_type: "unknown",
    iraqi_eligibility: null,
    kind: "program",
    levels: [],
    max_age: null,
    min_age: null,
  };
  const matches = (
    params: Record<string, string>,
    opportunity: Filtered = row
  ) => matchesOpportunityFilters(opportunity, opportunityFilters(params));

  it("reads only what it recognizes from the query string", () => {
    expect(none).toEqual({
      age: null,
      country: null,
      eligibility: null,
      funding: null,
      kind: null,
      level: null,
    });
    expect(
      opportunityFilters({
        age: "22",
        country: "de",
        eligibility: "inferred",
        funding: "self_funded",
        kind: "job",
        level: "phd",
      })
    ).toEqual({
      age: 22,
      country: "DE",
      eligibility: "inferred",
      funding: "self_funded",
      kind: "job",
      level: "phd",
    });
    expect(
      opportunityFilters({
        age: "200",
        country: "Germany",
        eligibility: "maybe",
        funding: ["fully_funded", "unknown"],
        kind: "<script>",
        level: "",
      })
    ).toEqual(none);
  });

  it("matches on each filter", () => {
    expect(matches({})).toBe(true);
    expect(matches({ kind: "scholarship" })).toBe(true);
    expect(matches({ kind: "job" })).toBe(false);
    expect(matches({ level: "phd" })).toBe(true);
    expect(matches({ level: "high_school" })).toBe(false);
    expect(matches({ country: "TR" })).toBe(true);
    expect(matches({ country: "FR" })).toBe(false);
    expect(matches({ funding: "fully_funded" })).toBe(true);
    expect(matches({ funding: "self_funded" })).toBe(false);
    expect(matches({ eligibility: "named_official" })).toBe(true);
    expect(matches({ eligibility: "inferred" })).toBe(false);
    expect(matches({ age: "18" })).toBe(true);
    expect(matches({ age: "30" })).toBe(true);
    expect(matches({ age: "17" })).toBe(false);
    expect(matches({ age: "31" })).toBe(false);
    expect(matches({ funding: "fully_funded", level: "high_school" })).toBe(
      false
    );
  });

  it("only claims a match for what's stated, but no age limit fits any age", () => {
    expect(matches({}, unstated)).toBe(true);
    expect(matches({ age: "50" }, unstated)).toBe(true);
    expect(matches({ level: "phd" }, unstated)).toBe(false);
    expect(matches({ country: "DE" }, unstated)).toBe(false);
    expect(matches({ funding: "fully_funded" }, unstated)).toBe(false);
    expect(matches({ eligibility: "named_official" }, unstated)).toBe(false);
  });

  it("works on rows from before the migration ran", () => {
    const before = {
      kind: "job",
    } as unknown as Filtered;
    expect(matches({}, before)).toBe(true);
    expect(matches({ age: "20", kind: "job" }, before)).toBe(true);
    expect(matches({ level: "phd" }, before)).toBe(false);
  });

  it("shows a source's site, even from a malformed link", () => {
    expect(sourceHost("https://www.daad.de/en/iraq")).toBe("www.daad.de");
    expect(sourceHost("https://")).toBe("https://");
  });

  it("names countries in the page's language", () => {
    expect(countryName("DE", "en")).toBe("Germany");
    expect(countryName("DE", "ar")).toBe("ألمانيا");
  });
});

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
