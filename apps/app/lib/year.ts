/**
 * A4, Your year at The IDEA: what the member did this calendar year (in
 * Baghdad), counted from their own records only.
 */

/** Baghdad is UTC+3 all year. */
const BAGHDAD_OFFSET_HOURS = 3;

/** The year in Baghdad, and the instant it began (ISO). */
export const baghdadYear = (now = new Date()) => {
  const local = new Date(now.getTime() + BAGHDAD_OFFSET_HOURS * 3_600_000);
  const year = local.getUTCFullYear();
  const start = new Date(
    Date.UTC(year, 0, 1, -BAGHDAD_OFFSET_HOURS)
  ).toISOString();
  return { start, year };
};

/** Orders that count: paid or further along, never cancelled or refunded. */
export const COUNTED_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
] as const;

/** Bulbs earned: purchases and bonuses that became available. */
export const earnedBulbs = (
  entries: readonly { amount: number; kind: string; status: string }[]
) =>
  entries
    .filter(
      (entry) =>
        entry.status === "available" &&
        entry.amount > 0 &&
        (entry.kind === "purchase" || entry.kind === "bonus")
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
