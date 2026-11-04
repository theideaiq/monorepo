import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { describe, expect, test } from "vitest";
import { type CatalogueJob, jobHealth, jobRows } from "./health";

const NOW = new Date("2026-11-04T12:00:00Z");
const hoursAgo = (hours: number) =>
  new Date(NOW.getTime() - hours * 3_600_000).toISOString();

const daily: CatalogueJob = {
  id: "bulbs",
  maxGapMinutes: 26 * 60,
  purpose: "Bulbs.",
  schedules: [{ cron: "30 3 * * *", runner: "vercel" }],
};

describe("jobHealth", () => {
  test("a recent success is OK", () => {
    expect(
      jobHealth({ last_failed_at: null, last_ok_at: hoursAgo(2) }, 1560, NOW)
    ).toEqual({ failing: false, overdue: false, state: "ok" });
  });

  test("a success older than the gap is overdue", () => {
    expect(
      jobHealth({ last_failed_at: null, last_ok_at: hoursAgo(27) }, 1560, NOW)
    ).toEqual({ failing: false, overdue: true, state: "overdue" });
    // Exactly at the gap is still on time.
    expect(
      jobHealth({ last_failed_at: null, last_ok_at: hoursAgo(26) }, 1560, NOW)
        .overdue
    ).toBe(false);
  });

  test("no success at all is overdue and reads as never run", () => {
    expect(jobHealth(null, 1560, NOW)).toEqual({
      failing: false,
      overdue: true,
      state: "never",
    });
    expect(
      jobHealth({ last_failed_at: null, last_ok_at: "not a date" }, 60, NOW)
        .state
    ).toBe("never");
  });

  test("a failure after the last success is failing, an older one isn't", () => {
    expect(
      jobHealth(
        { last_failed_at: hoursAgo(1), last_ok_at: hoursAgo(3) },
        1560,
        NOW
      )
    ).toEqual({ failing: true, overdue: false, state: "failing" });
    expect(
      jobHealth(
        { last_failed_at: hoursAgo(5), last_ok_at: hoursAgo(3) },
        1560,
        NOW
      ).state
    ).toBe("ok");
    expect(
      jobHealth({ last_failed_at: hoursAgo(1), last_ok_at: null }, 1560, NOW)
    ).toEqual({ failing: true, overdue: true, state: "failing" });
  });

  test("without a known gap nothing is overdue", () => {
    expect(jobHealth(null, null, NOW).overdue).toBe(false);
  });
});

describe("jobRows", () => {
  const run = (job: string, okHours: number | null) => ({
    job,
    last_duration_ms: null,
    last_error: null,
    last_failed_at: null,
    last_ok_at: okHours === null ? null : hoursAgo(okHours),
    last_started_at: null,
  });

  test("catalogue jobs first, then runs the catalogue doesn't know", () => {
    const rows = jobRows([daily], [run("zeta", 1), run("bulbs", 30)], NOW);
    expect(rows.map((row) => [row.id, row.health.state])).toEqual([
      ["bulbs", "overdue"],
      ["zeta", "ok"],
    ]);
    expect(rows[1].job).toBeNull();
  });

  test("a catalogue job without a run is overdue", () => {
    const [row] = jobRows([daily], [], NOW);
    expect(row.run).toBeNull();
    expect(row.health.overdue).toBe(true);
  });

  test("without the catalogue, runs still show", () => {
    expect(jobRows(null, [run("push", 1)], NOW).map((row) => row.id)).toEqual([
      "push",
    ]);
  });
});

describe("the Health messages", () => {
  test("every job state, queue channel and monitor state has a label", () => {
    for (const messages of [en, ar]) {
      const { health } = messages.admin;
      expect(Object.keys(health.jobs.states).sort()).toEqual(
        ["failing", "never", "ok", "overdue"].sort()
      );
      expect(Object.keys(health.queues.channels).sort()).toEqual(
        ["email", "push", "telegram", "whatsapp"].sort()
      );
      expect(Object.keys(health.monitors.states).sort()).toEqual(
        ["degraded", "operational", "partial", "unknown"].sort()
      );
    }
  });

  test("Arabic and English list the same jobs and integrations", () => {
    expect(Object.keys(ar.admin.health.jobPurpose).sort()).toEqual(
      Object.keys(en.admin.health.jobPurpose).sort()
    );
    expect(Object.keys(ar.admin.health.integrations).sort()).toEqual(
      Object.keys(en.admin.health.integrations).sort()
    );
  });
});
