/**
 * Staff → Settings → Health: what apps/api's `POST /admin/health` answers,
 * and the pure checks the page runs on `job_runs` (read as the staff
 * member).
 */

export interface JobSchedule {
  cron: string;
  runner: "github" | "vercel";
}

export interface CatalogueJob {
  id: string;
  maxGapMinutes: number;
  purpose: string;
  schedules: JobSchedule[];
}

export interface QueueCount {
  capped: boolean;
  count: number;
}

export type QueueChannel = "email" | "push" | "telegram" | "whatsapp";

export interface HealthAnswer {
  checkedAt: string;
  integrations: Record<string, boolean>;
  jobs: CatalogueJob[];
  queues: Record<QueueChannel, QueueCount | null> | null;
  status: {
    state: "degraded" | "operational" | "partial" | "unknown";
    url: string;
  } | null;
}

export interface JobRun {
  job: string;
  last_duration_ms: number | null;
  last_error: string | null;
  last_failed_at: string | null;
  last_ok_at: string | null;
  last_started_at: string | null;
}

export type JobState = "failing" | "never" | "ok" | "overdue";

export interface JobHealth {
  /** The last failure is newer than the last success. */
  failing: boolean;
  /** No success recorded, or the last one is older than the job's gap. */
  overdue: boolean;
  state: JobState;
}

const time = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * A job's state: overdue when its last OK is missing or older than
 * `maxGapMinutes` (null: the gap isn't known, so never overdue), failing
 * when its last failure came after its last OK. A failing job shows as
 * failing; otherwise overdue (or never run) before OK.
 */
export const jobHealth = (
  run: Pick<JobRun, "last_failed_at" | "last_ok_at"> | null | undefined,
  maxGapMinutes: number | null,
  now: Date = new Date()
): JobHealth => {
  const ok = time(run?.last_ok_at);
  const failed = time(run?.last_failed_at);
  const failing = failed !== null && (ok === null || failed > ok);
  const overdue =
    maxGapMinutes !== null &&
    (ok === null || now.getTime() - ok > maxGapMinutes * 60_000);

  let state: JobState = "ok";
  if (failing) {
    state = "failing";
  } else if (ok === null) {
    state = "never";
  } else if (overdue) {
    state = "overdue";
  }
  return { failing, overdue, state };
};

export interface JobRow {
  health: JobHealth;
  id: string;
  /** In the catalogue (null when the API couldn't be reached). */
  job: CatalogueJob | null;
  run: JobRun | null;
}

/**
 * One row per catalogue job with its run, then runs of jobs the catalogue
 * doesn't know (a renamed or removed job), so nothing recorded is hidden.
 */
export const jobRows = (
  catalogue: readonly CatalogueJob[] | null,
  runs: readonly JobRun[],
  now: Date = new Date()
): JobRow[] => {
  const byId = new Map(runs.map((run) => [run.job, run]));
  const rows: JobRow[] = (catalogue ?? []).map((job) => {
    const run = byId.get(job.id) ?? null;
    return {
      health: jobHealth(run, job.maxGapMinutes, now),
      id: job.id,
      job,
      run,
    };
  });
  const known = new Set(rows.map((row) => row.id));
  for (const run of [...runs].sort((a, b) => a.job.localeCompare(b.job))) {
    if (!known.has(run.job)) {
      rows.push({
        health: jobHealth(run, null, now),
        id: run.job,
        job: null,
        run,
      });
    }
  }
  return rows;
};
