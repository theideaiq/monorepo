import type { StaffRole } from "@repo/database";
import { canRead, type Section } from "./roles";

/**
 * The Inbox's decisions: every kind of item waiting on a staff decision,
 * the section whose page owns it, and how a list of them is filtered,
 * counted and timed. Pure, so the page and the tests share it.
 */
export const inboxKinds = [
  "support",
  "verifications",
  "checks",
  "returns",
  "shops",
  "applications",
  "submissions",
] as const;

export type InboxKind = (typeof inboxKinds)[number];

/** The section a kind belongs to (its list page and its actions). */
export const kindSection: Record<InboxKind, Section> = {
  applications: "editorial",
  checks: "catalog",
  returns: "orders",
  shops: "companies",
  submissions: "editorial",
  support: "support",
  verifications: "customers",
};

/** The full list of a kind, for "See all". */
export const kindHref: Record<InboxKind, string> = {
  applications: "/club/opportunities#applications",
  checks: "/catalog/checks",
  returns: "/orders/returns",
  shops: "/partners/shops",
  submissions: "/club/submissions",
  support: "/support?status=open",
  verifications: "/customers/verifications",
};

/** The kinds the role can open, in menu order. */
export const visibleKinds = (role: StaffRole | null | undefined) =>
  inboxKinds.filter((kind) => canRead(role, kindSection[kind]));

/** One decision in the Inbox (plain data, sent to the client list). */
export interface InboxRow {
  /** Who owns it, when the item has an owner (tickets, submissions). */
  assignee: string | null;
  assigneeName: string | null;
  /** A short line under the title (customer, shop, reason…). */
  detail: string;
  /** The full record. */
  href: string;
  id: string;
  /** `kind:id`, unique across kinds. */
  key: string;
  kind: InboxKind;
  /** When it started waiting (ISO). */
  since: string;
  /** What it is within its kind ("Identity check", "Disputed return"). */
  subtype: string;
  title: string;
}

export interface InboxFilter {
  kind: InboxKind | null;
  mine: boolean;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** `?kind=<kind>` and `?mine=1` from the Inbox's address. */
export const parseInboxFilter = (
  params: Record<string, string | string[] | undefined>
): InboxFilter => {
  const kind = first(params.kind);
  return {
    kind: (inboxKinds as readonly string[]).includes(kind ?? "")
      ? (kind as InboxKind)
      : null,
    mine: first(params.mine) === "1",
  };
};

/** The Inbox's address for a filter (paths without the locale). */
export const inboxHref = ({ kind, mine }: InboxFilter) => {
  const query = new URLSearchParams();
  if (kind) {
    query.set("kind", kind);
  }
  if (mine) {
    query.set("mine", "1");
  }
  const search = query.toString();
  return search ? `/?${search}` : "/";
};

/** Rows assigned to the user ("Mine"), or all of them. */
export const mineOnly = (
  rows: readonly InboxRow[],
  mine: boolean,
  userId: string
) => (mine ? rows.filter((row) => row.assignee === userId) : [...rows]);

/** Oldest first: whatever has waited longest is at the top. */
export const byWaiting = (rows: readonly InboxRow[]) =>
  [...rows].sort((a, b) => a.since.localeCompare(b.since));

/** How many rows of each kind (every kind present, zero when none). */
export const countByKind = (rows: readonly InboxRow[]) => {
  const counts = Object.fromEntries(inboxKinds.map((kind) => [kind, 0])) as {
    [K in InboxKind]: number;
  };
  for (const row of rows) {
    counts[row.kind] += 1;
  }
  return counts;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type WaitingUnit = "minutes" | "hours" | "days";

/**
 * How long an item has waited, in the largest whole unit (at least one
 * minute): 50 minutes, 5 hours, 3 days.
 */
export const waitingFor = (
  since: string,
  now: Date
): { unit: WaitingUnit; value: number } => {
  const elapsed = Math.max(now.getTime() - new Date(since).getTime(), 0);
  if (elapsed >= DAY) {
    return { unit: "days", value: Math.floor(elapsed / DAY) };
  }
  if (elapsed >= HOUR) {
    return { unit: "hours", value: Math.floor(elapsed / HOUR) };
  }
  return { unit: "minutes", value: Math.max(Math.floor(elapsed / MINUTE), 1) };
};

/** Past a day waiting: shown as late. */
export const isLate = (since: string, now: Date) =>
  now.getTime() - new Date(since).getTime() >= DAY;

/**
 * The row J/K moves to: the next or previous one, staying at the ends;
 * the first row when nothing is selected yet.
 */
export const stepSelection = (
  keys: readonly string[],
  current: string | null,
  step: 1 | -1
) => {
  if (keys.length === 0) {
    return null;
  }
  const index = current ? keys.indexOf(current) : -1;
  if (index === -1) {
    return keys[0] ?? null;
  }
  const next = Math.min(Math.max(index + step, 0), keys.length - 1);
  return keys[next] ?? null;
};
