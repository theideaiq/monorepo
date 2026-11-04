/**
 * The scheduled jobs: one per folder under `app/cron/`, with the same id
 * `recordJobRun` writes to `job_runs`. Schedules are copied from
 * `vercel.json` (Vercel Cron) and the GitHub Actions workflows that call a
 * cron route (`.github/workflows/*.yml`); both are in UTC. A test keeps
 * this list, the folders and the schedules in step.
 *
 * `maxGapMinutes` is how long Staff → Health waits after the last success
 * before it calls the job overdue: the shortest schedule plus some slack
 * (GitHub Actions schedules often start late).
 */
export interface JobSchedule {
  /** Five-field cron expression, UTC. */
  cron: string;
  runner: "github" | "vercel";
}

export interface Job {
  id: string;
  maxGapMinutes: number;
  /** One line for developers; Staff shows its own translated line. */
  purpose: string;
  schedules: JobSchedule[];
}

const DAILY_GAP = 26 * 60;

const daily = (cron: string) => ({
  maxGapMinutes: DAILY_GAP,
  schedules: [{ cron, runner: "vercel" as const }],
});

export const jobs: Job[] = [
  {
    id: "boxy",
    maxGapMinutes: 2 * 60,
    purpose:
      "Follows open Boxy parcels; the daily run also refreshes the delivery areas.",
    schedules: [
      { cron: "45 2 * * *", runner: "vercel" },
      { cron: "*/15 * * * *", runner: "github" },
    ],
  },
  {
    id: "bulbs",
    ...daily("30 3 * * *"),
    purpose: "Bulb expiry reminders and expiry, and birthday Bulbs.",
  },
  {
    id: "digital-codes",
    ...daily("35 7 * * *"),
    purpose: "Buys the digital codes still waiting after their payment.",
  },
  {
    id: "keep-alive",
    ...daily("0 1 * * *"),
    purpose: "Touches the database so Supabase doesn't pause the project.",
  },
  {
    id: "music",
    ...daily("40 2 * * *"),
    purpose: "Refreshes the artists of Spotify and Last.fm connections.",
  },
  {
    id: "newsletter-contacts",
    ...daily("0 4 * * *"),
    purpose: "Syncs newsletter contacts and unsubscribes with Resend.",
  },
  {
    id: "opportunities",
    ...daily("5 7 * * *"),
    purpose:
      "Tells followers when opportunities open or close soon, closes past listings and deletes old passport scans.",
  },
  {
    id: "plus-credits",
    ...daily("10 0 * * *"),
    purpose: "Gives Plus members their survey credits on the 1st of the month.",
  },
  {
    id: "plus-duo",
    ...daily("25 6 * * *"),
    purpose: "Ends Plus Duo places that are due to end and clears old invites.",
  },
  {
    id: "plus-seats",
    ...daily("15 6 * * *"),
    purpose: "Renews company-paid Plus seats and invoices the companies.",
  },
  {
    id: "push",
    ...daily("30 6 * * *"),
    purpose:
      "Sends the push, Telegram and WhatsApp messages the webhook missed.",
  },
  {
    id: "reminders",
    maxGapMinutes: 3 * 60,
    purpose: "Review requests and cart reminders, by notification and email.",
    schedules: [
      { cron: "50 8 * * *", runner: "vercel" },
      { cron: "17 * * * *", runner: "github" },
    ],
  },
  {
    id: "rentals",
    ...daily("0 5 * * *"),
    purpose: "Flags overdue Plus rentals and sends due-soon notices.",
  },
  {
    id: "selling",
    ...daily("40 3 * * *"),
    purpose:
      "Return and offer deadlines, shop scores, return refunds and closing surveys.",
  },
  {
    id: "student-checks",
    ...daily("20 2 * * *"),
    purpose:
      "Removes empty bare Passes, sweeps partners' student verifications and retries their webhooks.",
  },
  {
    id: "subscriptions",
    ...daily("0 6 * * *"),
    purpose: "Renewal invoices, and past-due and expired subscriptions.",
  },
  {
    id: "telegram-posts",
    ...daily("0 9 * * *"),
    purpose: "Queues scheduled Club posts and sends what the webhook missed.",
  },
];
