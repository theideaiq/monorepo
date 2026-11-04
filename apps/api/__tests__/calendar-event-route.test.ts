import { beforeEach, describe, expect, test, vi } from "vitest";

const row = {
  description_ar: "تعال وياك صديق",
  description_en: "Bring a friend",
  ends_at: null,
  id: "8d7f0e64-1d1a-4b0a-9a55-000000000001",
  location: "Karrada, Baghdad",
  slug: "game-night",
  starts_at: "2026-11-20T16:30:00Z",
  title_ar: "ليلة ألعاب",
  title_en: "Game night",
  updated_at: "2026-11-01T08:00:00Z",
};

const filters: [string, unknown][] = [];
let result: { data: unknown; error: { message: string } | null } = {
  data: row,
  error: null,
};

const query = {
  eq: (column: string, value: unknown) => {
    filters.push([column, value]);
    return query;
  },
  maybeSingle: () => Promise.resolve(result),
  select: () => query,
};

vi.mock("@repo/database/admin", () => ({
  createAdminClient: () => ({ from: () => query }),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const route = await import("../app/calendar/events/[slug]/route");

const get = (file: string, search = "") =>
  route.GET(
    new Request(`https://api.theideaiq.com/calendar/events/${file}${search}`),
    { params: Promise.resolve({ slug: file }) }
  );

describe("GET /calendar/events/<slug>.ics", () => {
  beforeEach(() => {
    filters.length = 0;
    result = { data: row, error: null };
  });

  test("serves a published event as an .ics file", async () => {
    const response = await get("game-night.ics", "?locale=en");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8"
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="game-night.ics"'
    );
    const body = await response.text();
    expect(body).toContain("SUMMARY:Game night");
    expect(body).toContain("DTSTART:20261120T163000Z");
    // No end time: two hours after the start.
    expect(body).toContain("DTEND:20261120T183000Z");
    expect(body).toContain("/club/events/game-night");
    expect(filters).toEqual([
      ["slug", "game-night"],
      ["published", true],
    ]);
  });

  test("is in Arabic by default", async () => {
    const body = await (await get("game-night.ics")).text();
    expect(body).toContain("SUMMARY:ليلة ألعاب");
    expect(body).toContain("/ar/club/events/game-night");
  });

  test("404s for unpublished or unknown events", async () => {
    result = { data: null, error: null };
    expect((await get("draft-event.ics")).status).toBe(404);
  });

  test("404s for paths that aren't an event file", async () => {
    expect((await get("game-night")).status).toBe(404);
    expect((await get("Game_Night.ics")).status).toBe(404);
    expect(filters).toEqual([]);
  });

  test("500s when the database fails", async () => {
    result = { data: null, error: { message: "down" } };
    expect((await get("game-night.ics")).status).toBe(500);
  });
});
