import type { Database } from "@repo/database";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Each cron job's last start, success and failure in `public.job_runs`
 * (migration 20270328000000_reminders_and_health.sql), for Staff → Health.
 * The job id is the route's folder under `app/cron/` (`opportunities`,
 * `telegram-posts`, …).
 */

type Admin = SupabaseClient<Database>;

/** The longest `last_error` the table takes. */
const MAX_ERROR = 500;

const EMAIL = /[^\s@<>"',;:]+@[^\s@<>"',;:]+/g;
const LONG_NUMBER = /\+?\d[\d\s-]{6,}\d/g;
const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * A short reason without personal data: email addresses and phone-like
 * numbers are masked, and it is cut to the column's 500 characters.
 */
export const jobError = (message: string) =>
  message
    .replace(EMAIL, "[email]")
    .replace(LONG_NUMBER, "[number]")
    .trim()
    .slice(0, MAX_ERROR) || "failed";

/** "HTTP 500", plus the response's `error` code when it gives one. */
const responseError = async (response: Response) => {
  let code: unknown;
  try {
    const body: unknown = await response.clone().json();
    code =
      body && typeof body === "object" && "error" in body
        ? body.error
        : undefined;
  } catch {
    code = undefined;
  }
  return typeof code === "string" && ERROR_CODE.test(code)
    ? `HTTP ${response.status}: ${code}`
    : `HTTP ${response.status}`;
};

/** Writes the job's row; a failure is logged, never thrown. */
const write = async (
  admin: Admin | (() => Admin),
  row: Database["public"]["Tables"]["job_runs"]["Insert"]
) => {
  try {
    const client = typeof admin === "function" ? admin() : admin;
    const { error } = await client
      .from("job_runs")
      .upsert(row, { onConflict: "job" });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    log.warn(
      `Job run of ${row.job} not recorded: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Runs a cron job and records it: `last_started_at` before it starts; on
 * success `last_ok_at`, `last_duration_ms` and no error; on a thrown error
 * or a 5xx response `last_failed_at` and a short `last_error`. The job's
 * own response (or error) is passed on unchanged, and a failure to record
 * never changes it. `admin` may be a function, so a client that can't be
 * made only skips the record.
 */
export const recordJobRun = async (
  admin: Admin | (() => Admin),
  job: string,
  run: () => Promise<Response>,
  now: () => number = Date.now
): Promise<Response> => {
  const started = now();
  await write(admin, {
    job,
    last_started_at: new Date(started).toISOString(),
  });

  let response: Response;
  try {
    response = await run();
  } catch (error) {
    await write(admin, {
      job,
      last_error: jobError(parseError(error)),
      last_failed_at: new Date(now()).toISOString(),
    });
    throw error;
  }

  const finished = now();
  await write(
    admin,
    response.status >= 500
      ? {
          job,
          last_error: jobError(await responseError(response)),
          last_failed_at: new Date(finished).toISOString(),
        }
      : {
          job,
          last_duration_ms: Math.max(0, Math.round(finished - started)),
          last_error: null,
          last_ok_at: new Date(finished).toISOString(),
        }
  );
  return response;
};
