import { describe, expect, test } from "vitest";
import {
  buildCalendar,
  escapeText,
  foldLine,
  formatUtc,
  PRODID,
} from "../lib/ics";

const BARE_NEWLINE = /[^\r]\n/;

const event = {
  description: "Bring a friend; seats are limited, first come\nfirst served.",
  endsAt: new Date("2026-11-20T19:00:00Z"),
  id: "8d7f0e64-1d1a-4b0a-9a55-000000000001",
  location: "The IDEA, Karrada, Baghdad",
  startsAt: new Date("2026-11-20T16:30:00Z"),
  title: "Game night: FC 26",
  updatedAt: new Date("2026-11-01T08:00:00.123Z"),
  url: "https://theideaiq.com/en/club/game-night",
};

describe("ICS builder", () => {
  test("escapes text values", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  test("formats times in UTC", () => {
    expect(formatUtc(new Date("2026-11-20T16:30:00.456Z"))).toBe(
      "20261120T163000Z"
    );
  });

  test("folds long lines at 75 octets without splitting characters", () => {
    const line = `SUMMARY:${"أمسية ".repeat(20)}`;
    const folded = foldLine(line);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const part of lines) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(lines.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(lines.map((part, i) => (i ? part.slice(1) : part)).join("")).toBe(
      line
    );
    expect(foldLine("SHORT:line")).toBe("SHORT:line");
  });

  test("builds a feed", () => {
    const ics = buildCalendar({ events: [event], name: "The IDEA events" });
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines).toContain(`PRODID:${PRODID}`);
    expect(lines).toContain("X-WR-TIMEZONE:Asia/Baghdad");
    expect(lines).toContain(`UID:${event.id}@theideaiq.com`);
    expect(lines).toContain("DTSTART:20261120T163000Z");
    expect(lines).toContain("DTEND:20261120T190000Z");
    expect(lines).toContain("DTSTAMP:20261101T080000Z");
    expect(lines).toContain("SUMMARY:Game night: FC 26");
    expect(lines).toContain("LOCATION:The IDEA\\, Karrada\\, Baghdad");
    expect(lines).toContain(
      "DESCRIPTION:Bring a friend\\; seats are limited\\, first come\\nfirst served."
    );
    expect(ics).not.toMatch(BARE_NEWLINE);
  });

  test("defaults the end to two hours and skips empty fields", () => {
    const ics = buildCalendar({
      events: [
        {
          ...event,
          description: null,
          endsAt: null,
          location: null,
          url: null,
        },
      ],
      name: "Events",
    });
    expect(ics).toContain("DTEND:20261120T183000Z");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("URL:");
  });

  test("an empty feed is still a valid calendar", () => {
    const ics = buildCalendar({ events: [], name: "Events" });
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});
