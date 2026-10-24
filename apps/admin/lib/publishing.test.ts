import { describe, expect, test } from "vitest";
import { publishedAtFor, publishState } from "./publishing";

const now = new Date("2026-11-04T12:00:00Z");

describe("publishing", () => {
  test("state", () => {
    expect(publishState(null, now)).toBe("draft");
    expect(publishState("2026-11-01T00:00:00Z", now)).toBe("published");
    expect(publishState("2026-12-01T00:00:00Z", now)).toBe("scheduled");
  });

  test("published_at for each mode", () => {
    expect(
      publishedAtFor("draft", {
        current: "2026-11-01T00:00:00Z",
        now,
        scheduledAt: null,
      })
    ).toBeNull();
    expect(
      publishedAtFor("now", { current: null, now, scheduledAt: null })
    ).toBe(now.toISOString());
    // Keeps the original date of something already published…
    expect(
      publishedAtFor("now", {
        current: "2026-11-01T00:00:00Z",
        now,
        scheduledAt: null,
      })
    ).toBe("2026-11-01T00:00:00Z");
    // …but publishes a scheduled one right away.
    expect(
      publishedAtFor("now", {
        current: "2026-12-01T00:00:00Z",
        now,
        scheduledAt: null,
      })
    ).toBe(now.toISOString());
    expect(
      publishedAtFor("schedule", {
        current: null,
        now,
        scheduledAt: "2026-11-05T09:00:00.000Z",
      })
    ).toBe("2026-11-05T09:00:00.000Z");
    expect(
      publishedAtFor("schedule", {
        current: null,
        now,
        scheduledAt: "2026-11-01T09:00:00.000Z",
      })
    ).toBeUndefined();
  });
});
