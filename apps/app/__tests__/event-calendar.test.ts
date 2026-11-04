import { describe, expect, test } from "vitest";
import {
  compactUtc,
  eventDetails,
  eventIcsUrl,
  eventTimes,
  googleCalendarUrl,
  MAX_DETAILS_LENGTH,
  outlookCalendarUrl,
} from "@/lib/event-calendar";

const event = {
  description: "Bring a friend; seats are limited & first come.",
  endsAt: "2026-11-20T19:00:00.000Z",
  location: "Karrada, Baghdad",
  startsAt: "2026-11-20T16:30:00.000Z",
  title: "Game night: FC 26 & friends",
  url: "https://theideaiq.com/club/events/game-night",
};

const ARABIC = /[\u0600-\u06FF]/;
const GOOGLE_DATES = /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/;

const paramsOf = (url: string) => new URL(url).searchParams;

describe("event calendar links", () => {
  test("Google gets UTC times and the details", () => {
    const url = googleCalendarUrl(event);
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(
      true
    );
    const params = paramsOf(url);
    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("dates")).toBe("20261120T163000Z/20261120T190000Z");
    expect(params.get("text")).toBe("Game night: FC 26 & friends");
    expect(params.get("location")).toBe("Karrada, Baghdad");
    expect(params.get("details")).toBe(`${event.description}\n\n${event.url}`);
  });

  test("Outlook gets ISO UTC times", () => {
    const url = outlookCalendarUrl(event);
    expect(
      url.startsWith("https://outlook.live.com/calendar/0/action/compose?")
    ).toBe(true);
    const params = paramsOf(url);
    expect(params.get("rru")).toBe("addevent");
    expect(params.get("subject")).toBe(event.title);
    expect(params.get("startdt")).toBe("2026-11-20T16:30:00Z");
    expect(params.get("enddt")).toBe("2026-11-20T19:00:00Z");
    expect(params.get("location")).toBe("Karrada, Baghdad");
  });

  test("escapes reserved characters", () => {
    const tricky = {
      ...event,
      location: "Café #2, A/B?x=1&y=2",
      title: "Rock & Roll 100% fun",
    };
    for (const url of [googleCalendarUrl(tricky), outlookCalendarUrl(tricky)]) {
      // One query string: nothing in the values leaks out as a parameter.
      expect(url.split("?").length).toBe(2);
      expect(url).not.toContain("#");
      expect(url).not.toContain(" ");
      // Spaces as %20: Outlook shows a "+" literally.
      expect(url).not.toContain("+");
      const params = paramsOf(url);
      expect(params.get("location")).toBe("Café #2, A/B?x=1&y=2");
      expect([params.get("text"), params.get("subject")]).toContain(
        "Rock & Roll 100% fun"
      );
      expect(params.has("y")).toBe(false);
    }
  });

  test("converts other offsets to UTC", () => {
    const { end, start } = eventTimes({
      endsAt: "2026-11-20T22:00:00+03:00",
      startsAt: "2026-11-20T19:30:00+03:00",
    });
    expect(compactUtc(start)).toBe("20261120T163000Z");
    expect(compactUtc(end)).toBe("20261120T190000Z");
  });

  test("a missing or earlier end lasts two hours", () => {
    expect(
      paramsOf(googleCalendarUrl({ ...event, endsAt: null })).get("dates")
    ).toBe("20261120T163000Z/20261120T183000Z");
    expect(
      paramsOf(
        outlookCalendarUrl({ ...event, endsAt: "2026-11-20T10:00:00Z" })
      ).get("enddt")
    ).toBe("2026-11-20T18:30:00Z");
  });

  test("keeps Arabic text as it is, with Latin digits in the times", () => {
    const arabic = {
      ...event,
      description: "تعال وياك صديق، المقاعد محدودة.",
      location: "الكرادة، بغداد",
      title: "ليلة ألعاب: FC 26",
      url: "https://theideaiq.com/ar/club/events/game-night",
    };
    const google = googleCalendarUrl(arabic);
    // Percent-encoded on the wire …
    expect(google).not.toMatch(ARABIC);
    // … and decoded back to the same words, in the same order.
    const params = paramsOf(google);
    expect(params.get("text")).toBe("ليلة ألعاب: FC 26");
    expect(params.get("location")).toBe("الكرادة، بغداد");
    expect(params.get("dates")).toMatch(GOOGLE_DATES);
    expect(paramsOf(outlookCalendarUrl(arabic)).get("startdt")).toBe(
      "2026-11-20T16:30:00Z"
    );
  });

  test("drops invisible bidi controls that could flip the text", () => {
    const params = paramsOf(
      googleCalendarUrl({
        ...event,
        location: "⁧بغداد⁩",
        title: "‮ليلة ألعاب‬",
      })
    );
    expect(params.get("text")).toBe("ليلة ألعاب");
    expect(params.get("location")).toBe("بغداد");
  });

  test("leaves out an empty place and description", () => {
    const params = paramsOf(
      googleCalendarUrl({ ...event, description: null, location: " " })
    );
    expect(params.has("location")).toBe(false);
    expect(params.get("details")).toBe(event.url);
  });

  test("shortens long descriptions", () => {
    const details = eventDetails({
      description: "a".repeat(MAX_DETAILS_LENGTH * 2),
      url: event.url,
    });
    expect(details.endsWith(`…\n\n${event.url}`)).toBe(true);
    expect(details.length).toBe(MAX_DETAILS_LENGTH + 2 + event.url.length);
  });

  test("links the .ics file in the page's language", () => {
    expect(eventIcsUrl("https://api.theideaiq.com/", "game-night", "en")).toBe(
      "https://api.theideaiq.com/calendar/events/game-night.ics?locale=en"
    );
    expect(eventIcsUrl("https://api.theideaiq.com", "game-night", "ar")).toBe(
      "https://api.theideaiq.com/calendar/events/game-night.ics?locale=ar"
    );
  });
});
