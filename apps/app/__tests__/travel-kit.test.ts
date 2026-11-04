import { describe, expect, test } from "vitest";
import {
  addDays,
  applicableRequirements,
  baghdadToday,
  type DocumentStatus,
  documentStatus,
  dueOn,
  findKit,
  kitDocuments,
  openQuestions,
  printouts,
  readyShare,
  schedule,
  type TravelRequirement,
} from "@/lib/travel-kit";

const line = (
  id: string,
  overrides: Partial<TravelRequirement> = {}
): TravelRequirement => ({
  anchor: null,
  checked_on: "2026-11-01",
  confidence: "official",
  copies: null,
  detail_ar: null,
  detail_en: null,
  doc_key: null,
  id,
  kind: "task",
  lead_days: null,
  minors_only: false,
  opportunity_id: null,
  position: 0,
  route_id: "route",
  source_url: "https://example.org",
  title_ar: id,
  title_en: id,
  ...overrides,
});

const passport = line("passport", {
  copies: 2,
  doc_key: "passport",
  kind: "document",
});
const photo = line("photo", { copies: 0, doc_key: "photo", kind: "document" });

describe("which requirements apply", () => {
  const guardian = line("guardian", { minors_only: true, position: 1 });
  const extra = line("extra", {
    opportunity_id: "program",
    position: 0,
    route_id: null,
  });
  const first = line("first", { position: 2 });

  test("guardian steps only for an under-18 traveller", () => {
    expect(
      applicableRequirements([guardian, first], false).map((r) => r.id)
    ).toEqual(["first"]);
    expect(
      applicableRequirements([guardian, first], true).map((r) => r.id)
    ).toEqual(["guardian", "first"]);
  });

  test("the route's lines come first, then the program's, by position", () => {
    expect(
      applicableRequirements([extra, first, guardian], true).map((r) => r.id)
    ).toEqual(["guardian", "first", "extra"]);
  });
});

describe("documents", () => {
  test("one card per kind of document, printing the larger count", () => {
    const again = line("program-passport", {
      copies: 3,
      doc_key: "passport",
      kind: "document",
      opportunity_id: "program",
      route_id: null,
    });
    const documents = kitDocuments([passport, line("task"), photo, again]);
    expect(documents.map((d) => d.id)).toEqual(["passport", "photo"]);
    expect(documents[0]?.copies).toBe(3);
  });

  test("status defaults to not started", () => {
    const statuses = new Map<string, DocumentStatus>([["passport", "ready"]]);
    expect(documentStatus(statuses, "passport")).toBe("ready");
    expect(documentStatus(statuses, "photo")).toBe("not_started");
    expect(documentStatus(statuses, null)).toBe("not_started");
  });

  test("the bulb fills with the share of documents Ready", () => {
    const statuses = new Map<string, DocumentStatus>([
      ["passport", "ready"],
      ["photo", "in_progress"],
    ]);
    expect(readyShare([passport, photo], statuses)).toBe(0.5);
    expect(readyShare([passport], statuses)).toBe(1);
    expect(readyShare([], statuses)).toBe(0);
  });

  test("printouts list documents with copies and add them up", () => {
    const letter = line("letter", {
      copies: 1,
      doc_key: "letter",
      kind: "document",
    });
    const result = printouts([passport, photo, letter]);
    expect(result.items.map((d) => d.id)).toEqual(["passport", "letter"]);
    expect(result.total).toBe(3);
  });
});

describe("the schedule", () => {
  test("days move across months and years", () => {
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2027-01-05", -10)).toBe("2026-12-26");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(() => addDays("soon", 1)).toThrow(RangeError);
  });

  test("a line is due its lead days before its anchor date", () => {
    const dates = { appointment_on: "2027-04-20", departure_on: null };
    expect(dueOn({ anchor: "appointment", lead_days: 14 }, dates)).toBe(
      "2027-04-06"
    );
    expect(dueOn({ anchor: "departure", lead_days: 3 }, dates)).toBeNull();
    expect(dueOn({ anchor: null, lead_days: null }, dates)).toBeNull();
  });

  test("dated lines come soonest first, marked, then the undated", () => {
    const book = line("book", { anchor: "appointment", lead_days: 30 });
    const insure = line("insure", { anchor: "departure", lead_days: 5 });
    const pack = line("pack", { anchor: "departure", lead_days: 1 });
    const anytime = line("anytime");
    const waiting = line("waiting", { anchor: "departure", lead_days: 2 });
    const passportDue = line("passport-due", {
      anchor: "appointment",
      doc_key: "passport",
      kind: "document",
      lead_days: 1,
    });
    const question = line("question", {
      anchor: "appointment",
      kind: "question",
      lead_days: 1,
    });
    const items = schedule({
      dates: { appointment_on: "2027-04-20", departure_on: "2027-04-12" },
      done: (requirement) => requirement.id === "pack",
      requirements: [
        anytime,
        pack,
        insure,
        book,
        passportDue,
        question,
        passport,
      ],
      today: "2027-04-01",
    });
    expect(
      items.map((item) => [item.requirement.id, item.due, item.state])
    ).toEqual([
      ["book", "2027-03-21", "overdue"],
      ["insure", "2027-04-07", "soon"],
      ["pack", "2027-04-11", "done"],
      ["passport-due", "2027-04-19", "later"],
      ["anytime", null, "undated"],
    ]);
    const undated = schedule({
      dates: { appointment_on: null, departure_on: null },
      done: () => false,
      requirements: [waiting],
      today: "2027-04-01",
    });
    expect(undated[0]?.state).toBe("undated");
  });

  test("open questions are the question lines", () => {
    const question = line("question", { kind: "question" });
    expect(openQuestions([passport, question, line("task")])).toEqual([
      question,
    ]);
  });

  test("today is Baghdad's day", () => {
    // 22:30 UTC is already the next day in Baghdad (UTC+3).
    expect(baghdadToday(new Date("2027-04-01T22:30:00Z"))).toBe("2027-04-02");
  });
});

describe("finding a kit", () => {
  const kits = [
    { id: "a", opportunity_id: null, route_id: "r1" },
    { id: "b", opportunity_id: "p1", route_id: "r1" },
  ];

  test("matches the route and the program, or no program", () => {
    expect(findKit(kits, "r1", null)?.id).toBe("a");
    expect(findKit(kits, "r1", "p1")?.id).toBe("b");
    expect(findKit(kits, "r2", null)).toBeNull();
  });
});
