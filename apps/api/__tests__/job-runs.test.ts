import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { jobError, recordJobRun } = await import("../lib/job-runs");

type Row = Record<string, unknown>;

const fakeAdmin = (error: { message: string } | null = null) => {
  const rows: Row[] = [];
  const upsert = vi.fn((row: Row, options: unknown) => {
    rows.push(row);
    expect(options).toEqual({ onConflict: "job" });
    return Promise.resolve({ error });
  });
  const admin = {
    from: vi.fn((table: string) => {
      expect(table).toBe("job_runs");
      return { upsert };
    }),
  } as unknown as Parameters<typeof recordJobRun>[0];
  return { admin, rows };
};

const clock = (...times: number[]) => {
  let i = 0;
  return () => {
    const time = times[Math.min(i, times.length - 1)] as number;
    i += 1;
    return time;
  };
};

const MASKED = /^Resend refused \[email\], \[number\]: x+$/;
const JOB_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const T0 = Date.parse("2027-01-10T07:05:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordJobRun", () => {
  test("records the start, then the success with its duration", async () => {
    const { admin, rows } = fakeAdmin();
    let startedFirst = false;
    const response = await recordJobRun(
      admin,
      "opportunities",
      () => {
        startedFirst = rows.length === 1;
        return Promise.resolve(Response.json({ ok: true }));
      },
      clock(T0, T0 + 1234)
    );
    expect(startedFirst).toBe(true);
    expect(await response.json()).toEqual({ ok: true });
    expect(rows).toEqual([
      { job: "opportunities", last_started_at: "2027-01-10T07:05:00.000Z" },
      {
        job: "opportunities",
        last_duration_ms: 1234,
        last_error: null,
        last_ok_at: "2027-01-10T07:05:01.234Z",
      },
    ]);
  });

  test("records a 5xx response as a failure, with its error code", async () => {
    const { admin, rows } = fakeAdmin();
    const response = await recordJobRun(
      admin,
      "boxy",
      () =>
        Promise.resolve(
          Response.json({ error: "reminders_failed" }, { status: 500 })
        ),
      clock(T0, T0 + 10)
    );
    expect(response.status).toBe(500);
    // The body is still readable by the caller.
    expect(await response.json()).toEqual({ error: "reminders_failed" });
    expect(rows[1]).toEqual({
      job: "boxy",
      last_error: "HTTP 500: reminders_failed",
      last_failed_at: "2027-01-10T07:05:00.010Z",
    });
  });

  test("records a 5xx with a plain body without its text", async () => {
    const { admin, rows } = fakeAdmin();
    await recordJobRun(
      admin,
      "selling",
      () =>
        Promise.resolve(
          new Response("Sweep failed for sara@example.iq", { status: 503 })
        ),
      clock(T0)
    );
    expect(rows[1]).toMatchObject({ last_error: "HTTP 503" });
  });

  test("a 4xx answer is not a failure of the job", async () => {
    const { admin, rows } = fakeAdmin();
    await recordJobRun(
      admin,
      "push",
      () => Promise.resolve(new Response("No", { status: 409 })),
      clock(T0)
    );
    expect(rows[1]).toHaveProperty("last_ok_at");
  });

  test("records a thrown error and throws it on", async () => {
    const { admin, rows } = fakeAdmin();
    const error = new Error(
      `Resend refused sara@example.iq, +964 770 123 4567: ${"x".repeat(600)}`
    );
    await expect(
      recordJobRun(admin, "reminders", () => Promise.reject(error), clock(T0))
    ).rejects.toBe(error);
    const failed = rows[1] as { last_error: string; last_failed_at: string };
    expect(failed.last_failed_at).toBe("2027-01-10T07:05:00.000Z");
    expect(failed.last_error).toMatch(MASKED);
    expect(failed.last_error).toHaveLength(500);
  });

  test("a failure to record never changes the job's response", async () => {
    const broken = fakeAdmin({ message: "permission denied" });
    const ok = Response.json({ ok: true });
    expect(
      await recordJobRun(broken.admin, "music", () => Promise.resolve(ok))
    ).toBe(ok);

    // A client that can't be made, or isn't a client at all.
    const noClient = () => {
      throw new Error("Supabase admin client requires a key");
    };
    expect(
      await recordJobRun(noClient, "music", () => Promise.resolve(ok))
    ).toBe(ok);
    expect(
      await recordJobRun(
        {} as Parameters<typeof recordJobRun>[0],
        "music",
        () => Promise.resolve(ok)
      )
    ).toBe(ok);
  });
});

test("jobError masks personal data and keeps short reasons", () => {
  expect(jobError("relation does not exist")).toBe("relation does not exist");
  expect(jobError("to omar@theideaiq.com")).toBe("to [email]");
  expect(jobError("   ")).toBe("failed");
});

test("every cron route records its run under its folder's name", () => {
  const cron = path.resolve(import.meta.dirname, "../app/cron");
  const jobs = readdirSync(cron, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(jobs.length).toBeGreaterThan(10);
  for (const job of jobs) {
    const source = readFileSync(path.join(cron, job, "route.ts"), "utf8");
    expect(source, job).toContain(`recordJobRun(createAdminClient, "${job}",`);
    expect(job).toMatch(JOB_ID);
  }
});
