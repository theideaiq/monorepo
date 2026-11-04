import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  countEligible,
  integrations,
  QUEUE_READ_LIMIT,
  stuckWindow,
} from "../lib/health";
import { jobs } from "../lib/jobs";

const root = path.resolve(import.meta.dirname, "..");
const workflows = path.resolve(root, "../../.github/workflows");

const cronFolders = readdirSync(path.join(root, "app/cron")).filter((name) =>
  statSync(path.join(root, "app/cron", name)).isDirectory()
);

const JOB_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const CRON_PATH = /^\/cron\/([a-z0-9-]+)/;
const WORKFLOW_CRON = /cron:\s*"([^"]+)"/g;
const WORKFLOW_ROUTE = /\/cron\/([a-z0-9-]+)/g;

const schedulesOf = (id: string, runner: "github" | "vercel") =>
  (jobs.find((job) => job.id === id)?.schedules ?? [])
    .filter((schedule) => schedule.runner === runner)
    .map((schedule) => schedule.cron)
    .sort();

describe("the job catalogue", () => {
  test("every cron folder is a job, and every job has a folder", () => {
    expect(jobs.map((job) => job.id).sort()).toEqual([...cronFolders].sort());
  });

  test("ids are unique and fit job_runs.job", () => {
    const ids = jobs.map((job) => job.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(JOB_ID);
    }
  });

  test("every job has a schedule, a purpose and a gap longer than its schedule", () => {
    for (const job of jobs) {
      expect(job.schedules.length).toBeGreaterThan(0);
      expect(job.purpose.length).toBeGreaterThan(10);
      expect(job.maxGapMinutes).toBeGreaterThanOrEqual(60);
    }
  });

  test("Vercel schedules match vercel.json", () => {
    const { crons } = JSON.parse(
      readFileSync(path.join(root, "vercel.json"), "utf8")
    ) as { crons: { path: string; schedule: string }[] };
    const fromFile = new Map<string, string[]>();
    for (const cron of crons) {
      const id = CRON_PATH.exec(cron.path)?.[1];
      expect(id, cron.path).toBeDefined();
      fromFile.set(id as string, [
        ...(fromFile.get(id as string) ?? []),
        cron.schedule,
      ]);
    }
    for (const job of jobs) {
      expect(schedulesOf(job.id, "vercel"), job.id).toEqual(
        (fromFile.get(job.id) ?? []).sort()
      );
    }
  });

  test("GitHub schedules match the workflows that call a cron route", () => {
    const fromWorkflows = new Map<string, string[]>();
    for (const file of readdirSync(workflows)) {
      const text = readFileSync(path.join(workflows, file), "utf8");
      const ids = new Set(
        [...text.matchAll(WORKFLOW_ROUTE)].map((match) => match[1])
      );
      const crons = [...text.matchAll(WORKFLOW_CRON)].map((match) => match[1]);
      for (const id of ids) {
        fromWorkflows.set(id, [...(fromWorkflows.get(id) ?? []), ...crons]);
      }
    }
    for (const job of jobs) {
      expect(schedulesOf(job.id, "github"), job.id).toEqual(
        (fromWorkflows.get(job.id) ?? []).sort()
      );
    }
  });
});

describe("health helpers", () => {
  test("integrations are booleans and need every value they use", () => {
    const result = integrations({
      RESEND_FROM: "",
      RESEND_TOKEN: "re_x",
      WAYL_API_TOKEN: "t",
      WAYL_WEBHOOK_SECRET: "secret-secret",
    });
    expect(result.wayl).toBe(true);
    expect(result.resend).toBe(false);
    expect(result.supabase).toBe(false);
    for (const value of Object.values(result)) {
      expect(typeof value).toBe("boolean");
    }
  });

  test("stuck means older than an hour, inside the claim window", () => {
    const now = new Date("2026-11-04T12:00:00Z");
    expect(stuckWindow(now)).toEqual({
      before: "2026-11-04T11:00:00.000Z",
      since: "2026-11-03T12:00:00.000Z",
    });
    expect(stuckWindow(now, 2).since).toBe("2026-11-02T12:00:00.000Z");
  });

  test("only eligible recipients count, and a full read says so", () => {
    expect(
      countEligible(
        [{ user_id: "a" }, { user_id: "b" }, { user_id: "a" }],
        new Set(["a"])
      )
    ).toEqual({ capped: false, count: 2 });
    const full = Array.from({ length: QUEUE_READ_LIMIT }, () => ({
      user_id: "a",
    }));
    expect(countEligible(full, new Set())).toEqual({ capped: true, count: 0 });
  });
});
