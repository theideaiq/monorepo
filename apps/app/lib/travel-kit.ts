import type { Enums, Tables } from "@repo/database";

/**
 * The Travel Kit: a member's folder for one trip (a visa route, and the
 * program they travel for). Editors enter every requirement with its
 * source, confidence and checked date; this module only decides which
 * apply, how they are dated and how far along the member is. It never
 * holds a document or a scan.
 */

export type TravelRequirement = Pick<
  Tables<"travel_requirements">,
  | "anchor"
  | "checked_on"
  | "confidence"
  | "copies"
  | "detail_ar"
  | "detail_en"
  | "doc_key"
  | "id"
  | "kind"
  | "lead_days"
  | "minors_only"
  | "opportunity_id"
  | "position"
  | "route_id"
  | "source_url"
  | "title_ar"
  | "title_en"
>;

export const TRAVEL_REQUIREMENT_COLUMNS =
  "id, route_id, opportunity_id, kind, doc_key, position, title_ar, title_en, detail_ar, detail_en, copies, anchor, lead_days, minors_only, confidence, source_url, checked_on";

export type DocumentStatus = Enums<"travel_document_status">;

export const documentStatuses = [
  "not_started",
  "in_progress",
  "ready",
] as const satisfies readonly DocumentStatus[];

export const isDocumentStatus = (value: unknown): value is DocumentStatus =>
  typeof value === "string" &&
  (documentStatuses as readonly string[]).includes(value);

/** The folder's lettered tabs, in order. */
export const kitTabs = [
  "documents",
  "printouts",
  "schedule",
  "questions",
] as const;

export type KitTab = (typeof kitTabs)[number];

export const travelPath = "/club/travel";
export const kitsPath = "/pass/travel";
export const kitPath = (kitId: string) =>
  `/pass/travel/${encodeURIComponent(kitId)}`;

/**
 * The lines that apply to this kit: the route's, then the program's extras,
 * each by position; guardian steps (`minors_only`) only for an under-18
 * traveller.
 */
export const applicableRequirements = <T extends TravelRequirement>(
  requirements: readonly T[],
  minor: boolean
): T[] =>
  requirements
    .filter((requirement) => minor || !requirement.minors_only)
    .sort(
      (a, b) =>
        Number(a.route_id === null) - Number(b.route_id === null) ||
        a.position - b.position
    );

/**
 * One line per kind of document: a program that repeats a route's document
 * (its passport, say) adds no second card, and the copies to print are the
 * larger of the two.
 */
export const kitDocuments = <T extends TravelRequirement>(
  requirements: readonly T[]
): T[] => {
  const byKey = new Map<string, T>();
  for (const requirement of requirements) {
    if (requirement.kind !== "document" || !requirement.doc_key) {
      continue;
    }
    const seen = byKey.get(requirement.doc_key);
    if (!seen) {
      byKey.set(requirement.doc_key, requirement);
    } else if ((requirement.copies ?? 0) > (seen.copies ?? 0)) {
      byKey.set(requirement.doc_key, { ...seen, copies: requirement.copies });
    }
  }
  return [...byKey.values()];
};

/** Where the member stands with a kind of document (not started by default). */
export const documentStatus = (
  statuses: ReadonlyMap<string, DocumentStatus>,
  docKey: string | null
): DocumentStatus => (docKey ? statuses.get(docKey) : null) ?? "not_started";

/** The share of the kit's documents marked Ready, from 0 to 1 (0 with none). */
export const readyShare = (
  documents: readonly Pick<TravelRequirement, "doc_key">[],
  statuses: ReadonlyMap<string, DocumentStatus>
) => {
  if (documents.length === 0) {
    return 0;
  }
  const ready = documents.filter(
    (document) => documentStatus(statuses, document.doc_key) === "ready"
  ).length;
  return ready / documents.length;
};

/** The documents to print, with how many sheets in all. */
export const printouts = <T extends TravelRequirement>(
  documents: readonly T[]
) => {
  const items = documents.filter((document) => (document.copies ?? 0) > 0);
  return {
    items,
    total: items.reduce((sum, document) => sum + (document.copies ?? 0), 0),
  };
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `day` (`YYYY-MM-DD`) moved by `days`, as a `YYYY-MM-DD` day. */
export const addDays = (day: string, days: number) => {
  if (!ISO_DAY.test(day)) {
    throw new RangeError(`Not a day: ${day}`);
  }
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

/** Whole days from `from` to `to` (both `YYYY-MM-DD`). */
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  );

/** A `YYYY-MM-DD` day as a Date at noon, for formatting it as a calendar day. */
export const calendarDay = (day: string) => new Date(`${day}T12:00:00`);

/** Today in Baghdad, as `YYYY-MM-DD`. */
export const baghdadToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(now);

export interface KitDates {
  readonly appointment_on: string | null;
  readonly departure_on: string | null;
}

/**
 * When a line is due: its anchor date (the appointment or departure)
 * minus its lead days; null while it has no anchor or that date isn't set.
 */
export const dueOn = (
  requirement: Pick<TravelRequirement, "anchor" | "lead_days">,
  dates: KitDates
) => {
  if (!requirement.anchor || requirement.lead_days === null) {
    return null;
  }
  const anchor =
    requirement.anchor === "appointment"
      ? dates.appointment_on
      : dates.departure_on;
  return anchor ? addDays(anchor, -requirement.lead_days) : null;
};

/** Due within this many days counts as soon. */
export const SOON_DAYS = 7;

export type ScheduleState = "done" | "later" | "overdue" | "soon" | "undated";

export interface ScheduleItem<T extends TravelRequirement> {
  readonly due: string | null;
  readonly requirement: T;
  readonly state: ScheduleState;
}

/**
 * The schedule, worked backward from the member's dates: the tasks, and
 * the documents that have a deadline, soonest first; overdue and soon are
 * marked (a task once ticked, a document once Ready, is done). Lines
 * without a date (no anchor, or its date not entered yet) come last.
 */
export const schedule = <T extends TravelRequirement>({
  dates,
  done,
  requirements,
  today,
}: {
  readonly dates: KitDates;
  /** Whether a line is done: ticked, or for a document, Ready. */
  readonly done: (requirement: T) => boolean;
  readonly requirements: readonly T[];
  /** `YYYY-MM-DD`, in Baghdad. */
  readonly today: string;
}): ScheduleItem<T>[] => {
  const items = requirements
    .filter(
      (requirement) =>
        requirement.kind === "task" ||
        (requirement.kind === "document" && requirement.anchor !== null)
    )
    .map((requirement): ScheduleItem<T> => {
      const due = dueOn(requirement, dates);
      let state: ScheduleState = "later";
      if (done(requirement)) {
        state = "done";
      } else if (due === null) {
        state = "undated";
      } else if (due < today) {
        state = "overdue";
      } else if (daysBetween(today, due) <= SOON_DAYS) {
        state = "soon";
      }
      return { due, requirement, state };
    });
  const dated = items
    .filter((item) => item.due !== null)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  return [...dated, ...items.filter((item) => item.due === null)];
};

/** The open questions to ask (the embassy, the program) before going. */
export const openQuestions = <T extends TravelRequirement>(
  requirements: readonly T[]
) => requirements.filter((requirement) => requirement.kind === "question");

/** A kit for this route and program, among the member's kits. */
export const findKit = <
  K extends { opportunity_id: string | null; route_id: string },
>(
  kits: readonly K[],
  routeId: string,
  opportunityId: string | null
) =>
  kits.find(
    (kit) =>
      kit.route_id === routeId &&
      (kit.opportunity_id ?? null) === (opportunityId ?? null)
  ) ?? null;
