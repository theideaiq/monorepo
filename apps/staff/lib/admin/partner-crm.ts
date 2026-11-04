import { parseCsv } from "@repo/commerce/csv";
import { Constants, type TablesUpdate } from "@repo/database";
import { z } from "zod";
import {
  checkbox,
  dateTime,
  optionalDate,
  optionalInt,
  optionalText,
  optionalUuid,
  tags,
  text,
  uuid,
} from "./forms";

/**
 * The partner CRM (migration 20270329000000): organizations The IDEA works
 * with or approaches, their work contacts, every touch and the deals. Pure
 * schemas and helpers shared by the pages, the Server Actions and the
 * tests. People's details are third parties' personal data: nothing here
 * logs them or sends them anywhere but the database.
 */

const { Enums } = Constants.public;

export const partnerStages = Enums.partner_stage;
export const partnerKinds = Enums.partner_kind;
export const touchChannels = Enums.partner_touch_channel;
export const dealKinds = Enums.partner_deal_kind;
export const dealStages = Enums.partner_deal_stage;

export type PartnerStage = (typeof partnerStages)[number];
export type PartnerKind = (typeof partnerKinds)[number];
export type TouchChannel = (typeof touchChannels)[number];
export type DealKind = (typeof dealKinds)[number];
export type DealStage = (typeof dealStages)[number];

/** 1 high, 2 normal, 3 low (as the database). */
export const priorities = [1, 2, 3] as const;
export type Priority = (typeof priorities)[number];

/** Deal values are in IQD, in steps of 250 (as the database). */
export const IQD_STEP = 250;

/** The roles whose staff can own an organization (they can read the CRM). */
export const crmRoles = ["editor", "marketing", "admin", "superadmin"] as const;

// ── Values ──────────────────────────────────────────────────────────────

const HTTP_URL = /^https?:\/\//i;
const BARE_DOMAIN =
  /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]\S*)?$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()-]{6,30}$/;
const EASTERN_DIGITS = /[٠-٩۰-۹]/g;

/** ISO 3166-1 alpha-2, every officially assigned code. */
export const COUNTRY_CODES = new Set(
  (
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI " +
    "BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN " +
    "CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK " +
    "FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM " +
    "HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN " +
    "KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK " +
    "ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP " +
    "NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
    "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF " +
    "TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI " +
    "VN VU WF WS YE YT ZA ZM ZW"
  ).split(" ")
);

export const isCountryCode = (value: string) => COUNTRY_CODES.has(value);

/** Common short names that aren't the country's own name. */
const COUNTRY_ALIASES: Record<string, string> = {
  britain: "GB",
  "great britain": "GB",
  uae: "AE",
  uk: "GB",
  "united states of america": "US",
  usa: "US",
};

let countryNames: Map<string, string> | null = null;

/** English and Arabic country names → code, built once. */
const namesToCodes = () => {
  if (countryNames) {
    return countryNames;
  }
  const map = new Map<string, string>(Object.entries(COUNTRY_ALIASES));
  for (const locale of ["en", "ar"]) {
    let names: Intl.DisplayNames;
    try {
      names = new Intl.DisplayNames([locale], {
        fallback: "none",
        type: "region",
      });
    } catch {
      continue;
    }
    for (const code of COUNTRY_CODES) {
      const name = names.of(code);
      if (name) {
        map.set(name.toLowerCase(), code);
      }
    }
  }
  countryNames = map;
  return map;
};

/**
 * A country as an ISO code: the code itself (any case) or the country's
 * name in English or Arabic. Null when it isn't one.
 */
export const parseCountry = (value: string): string | null => {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const upper = cleaned.toUpperCase();
  if (upper.length === 2) {
    return isCountryCode(upper) ? upper : null;
  }
  return namesToCodes().get(cleaned.toLowerCase().replace(/\s+/g, " ")) ?? null;
};

/**
 * A web address: http(s) as written, or a bare domain ("example.org") with
 * https:// in front. Null when it isn't one or is longer than `max`.
 */
export const parseUrl = (value: string, max: number): string | null => {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  let candidate = cleaned;
  if (!HTTP_URL.test(cleaned)) {
    if (!BARE_DOMAIN.test(cleaned)) {
      return null;
    }
    candidate = `https://${cleaned}`;
  }
  if (candidate.length > max) {
    return null;
  }
  try {
    const url = new URL(candidate);
    if (!(url.protocol === "http:" || url.protocol === "https:")) {
      return null;
    }
    if (!url.hostname.includes(".")) {
      return null;
    }
  } catch {
    return null;
  }
  return candidate;
};

/** How organizations are matched: the website, lower-cased. */
export const websiteKey = (website: string) => website.trim().toLowerCase();

export const isEmail = (value: string) =>
  EMAIL.test(value) && value.length <= 254;

/** Latin digits for a phone number typed with Arabic-Indic ones. */
export const latinDigits = (value: string) =>
  value.replace(EASTERN_DIGITS, (digit) =>
    String((digit.codePointAt(0) ?? 0) % 16)
  );

export const isPhone = (value: string) => PHONE.test(value);

const ISO_DATE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T][\d:.]+Z?)?$/;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * A calendar date as YYYY-MM-DD from "2026-11-04", "2026/11/4" or
 * "2026-11-04 00:00". Day-first or month-first dates are refused: they
 * can't be told apart.
 */
export const parseIsoDate = (value: string): string | null => {
  const match = ISO_DATE.exec(value.trim());
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1, 4).map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
};

// ── Forms ───────────────────────────────────────────────────────────────

const optionalUrl = (max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(
      z.union([z.null(), z.string().max(max).regex(HTTP_URL).pipe(z.url())])
    );

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), z.string().max(254).regex(EMAIL)]));

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? latinDigits(value) : null))
  .pipe(z.union([z.null(), z.string().regex(PHONE)]));

const optionalCountry = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), z.string().refine(isCountryCode)]));

const nextActionPair = (
  row: { nextAction: string | null; nextActionOn: string | null },
  context: z.RefinementCtx
) => {
  if (row.nextAction && !row.nextActionOn) {
    context.addIssue({
      code: "custom",
      message: "date",
      path: ["nextActionOn"],
    });
  }
  if (row.nextActionOn && !row.nextAction) {
    context.addIssue({
      code: "custom",
      message: "action",
      path: ["nextAction"],
    });
  }
};

/** An organization's fields (its stage, owner and next action included). */
export const orgSchema = z
  .object({
    city: optionalText(120),
    country: optionalCountry,
    email: optionalEmail,
    id: optionalUuid,
    kind: z.enum(partnerKinds),
    name: text(200),
    nameAr: optionalText(200),
    nextAction: optionalText(300),
    nextActionOn: optionalDate,
    notes: optionalText(10_000),
    ownerId: optionalUuid,
    priority: z.enum(["1", "2", "3"]).transform(Number),
    sourceUrl: optionalUrl(1000),
    stage: z.enum(partnerStages),
    tags,
    website: optionalUrl(500),
  })
  .superRefine(nextActionPair);

export type OrgInput = z.output<typeof orgSchema>;

/** The organization's columns from the form. */
export const orgRow = (input: OrgInput) => ({
  city: input.city,
  country: input.country,
  email: input.email,
  kind: input.kind,
  name: input.name,
  name_ar: input.nameAr,
  next_action: input.nextAction,
  next_action_on: input.nextActionOn,
  notes: input.notes,
  owner_id: input.ownerId,
  priority: input.priority,
  source_url: input.sourceUrl,
  stage: input.stage,
  tags: input.tags,
  website: input.website,
});

/** A work contact at an organization; where it came from is required. */
export const personSchema = z.object({
  email: optionalEmail,
  id: optionalUuid,
  name: text(200),
  notes: optionalText(2000),
  orgId: uuid,
  phone: optionalPhone,
  role: optionalText(200),
  source: text(300),
});

export type PersonInput = z.output<typeof personSchema>;

export const personRow = (input: PersonInput) => ({
  email: input.email,
  name: input.name,
  notes: input.notes,
  phone: input.phone,
  role: input.role,
  source: input.source,
});

/**
 * A touch (an email, a call, a meeting), and optionally the
 * organization's next action, set or cleared at the same time.
 */
export const touchSchema = z
  .object({
    channel: z.enum(touchChannels),
    clearNextAction: checkbox,
    direction: z.enum(["outbound", "inbound"]),
    happenedAt: dateTime,
    nextAction: optionalText(300),
    nextActionOn: optionalDate,
    orgId: uuid,
    personId: optionalUuid,
    summary: text(2000),
  })
  .superRefine(nextActionPair)
  .refine((row) => !(row.clearNextAction && row.nextAction), {
    path: ["clearNextAction"],
  });

export type TouchInput = z.output<typeof touchSchema>;

/** What a touch changes on its organization, if anything. */
export const touchNextAction = (input: TouchInput) => {
  if (input.nextAction && input.nextActionOn) {
    return {
      next_action: input.nextAction,
      next_action_on: input.nextActionOn,
    };
  }
  if (input.clearNextAction) {
    return { next_action: null, next_action_on: null };
  }
  return null;
};

/** An amount in IQD, in steps of 250 (thousands separators allowed). */
export const optionalIqd = optionalInt(0, 1_000_000_000_000).refine(
  (value) => value === null || value % IQD_STEP === 0
);

export const dealSchema = z.object({
  expectedOn: optionalDate,
  id: optionalUuid,
  kind: z.enum(dealKinds),
  notes: optionalText(4000),
  opportunityId: optionalUuid,
  orgId: uuid,
  stage: z.enum(dealStages),
  title: text(200),
  valueIqd: optionalIqd,
});

export type DealInput = z.output<typeof dealSchema>;

export const dealRow = (input: DealInput) => ({
  expected_on: input.expectedOn,
  kind: input.kind,
  notes: input.notes,
  opportunity_id: input.opportunityId,
  stage: input.stage,
  title: input.title,
  value_iqd: input.valueIqd,
});

// ── The list ────────────────────────────────────────────────────────────

export type DueState = "overdue" | "today" | "upcoming";

/** Whether a next action is late, due today or later (dates as YYYY-MM-DD). */
export const dueState = (
  nextActionOn: string | null,
  today: string
): DueState | null => {
  if (!nextActionOn) {
    return null;
  }
  if (nextActionOn < today) {
    return "overdue";
  }
  return nextActionOn === today ? "today" : "upcoming";
};

export interface CrmFilter {
  country: string | null;
  /** Only those with a next action on or before today. */
  due: boolean;
  kind: PartnerKind | null;
  mine: boolean;
  owner: string | null;
  q: string;
  stage: PartnerStage | null;
  tag: string | null;
}

type Params = Record<string, string | string[] | undefined>;

const first = (params: Params, key: string) => {
  const value = params[key];
  return ((Array.isArray(value) ? value[0] : value) ?? "").trim();
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The list's filters from its address; anything unknown is ignored. */
export const parseCrmFilter = (params: Params): CrmFilter => {
  const stage = first(params, "stage");
  const kind = first(params, "kind");
  const country = first(params, "country").toUpperCase();
  const owner = first(params, "owner");
  const tag = first(params, "tag").toLowerCase().slice(0, 40);
  return {
    country: isCountryCode(country) ? country : null,
    due: first(params, "due") === "1",
    kind: (partnerKinds as readonly string[]).includes(kind)
      ? (kind as PartnerKind)
      : null,
    mine: first(params, "mine") === "1",
    owner: UUID.test(owner) ? owner : null,
    q: first(params, "q").slice(0, 100),
    stage: (partnerStages as readonly string[]).includes(stage)
      ? (stage as PartnerStage)
      : null,
    tag: tag || null,
  };
};

/** Whether any filter narrows the list ("No results" rather than "Empty"). */
export const isFiltered = (filter: CrmFilter) =>
  [
    filter.stage,
    filter.kind,
    filter.country,
    filter.owner,
    filter.tag,
    filter.q,
  ].some(Boolean) ||
  filter.mine ||
  filter.due;

type Range = readonly [from: number, to: number];

/**
 * The list shows the due organizations first, then the rest (each by
 * priority): two queries. For the page's rows `from`–`to` and how many
 * are due, the range to read from each (null when it has none).
 */
export const splitRange = (
  from: number,
  to: number,
  dueCount: number
): { due: Range | null; rest: Range | null } => ({
  due: from < dueCount ? [from, Math.min(to, dueCount - 1)] : null,
  rest: to >= dueCount ? [Math.max(from - dueCount, 0), to - dueCount] : null,
});

// ── The CSV import ──────────────────────────────────────────────────────

/**
 * The most characters a sheet may have: both sheets go to the Server
 * Action in one request, which must stay under its 1 MB body.
 */
export const MAX_SHEET_CHARS = 220_000;

/** The organizations sheet's columns. */
export const ORG_COLUMNS = [
  "name",
  "name_ar",
  "kind",
  "country",
  "city",
  "website",
  "email",
  "stage",
  "priority",
  "next_action",
  "next_action_on",
  "source_url",
  "tags",
  "notes",
] as const;

export type OrgColumn = (typeof ORG_COLUMNS)[number];

/** Other headers the outreach workbook uses for the same columns. */
export const ORG_ALIASES: Record<string, OrgColumn> = {
  arabic: "name_ar",
  arabic_name: "name_ar",
  category: "kind",
  comment: "notes",
  comments: "notes",
  contact_email: "email",
  country_code: "country",
  domain: "website",
  due: "next_action_on",
  due_date: "next_action_on",
  e_mail: "email",
  english_name: "name",
  follow_up: "next_action_on",
  follow_up_date: "next_action_on",
  found_at: "source_url",
  general_email: "email",
  homepage: "website",
  iso: "country",
  label: "tags",
  labels: "tags",
  mail: "email",
  name_arabic: "name_ar",
  name_en: "name",
  next_action_date: "next_action_on",
  next_date: "next_action_on",
  next_step: "next_action",
  note: "notes",
  org: "name",
  org_name: "name",
  organisation: "name",
  organisation_name: "name",
  organization: "name",
  organization_name: "name",
  pipeline_stage: "stage",
  prio: "priority",
  reference: "source_url",
  remarks: "notes",
  site: "website",
  source: "source_url",
  source_link: "source_url",
  status: "stage",
  tag: "tags",
  town: "city",
  type: "kind",
  url: "website",
  web: "website",
  web_site: "website",
};

/** The people sheet's columns: each row names its organization. */
export const PEOPLE_COLUMNS = [
  "org_website",
  "org_name",
  "name",
  "role",
  "email",
  "phone",
  "source",
  "notes",
] as const;

export type PeopleColumn = (typeof PEOPLE_COLUMNS)[number];

export const PEOPLE_ALIASES: Record<string, PeopleColumn> = {
  comments: "notes",
  contact: "name",
  contact_name: "name",
  e_mail: "email",
  full_name: "name",
  job_title: "role",
  mail: "email",
  mobile: "phone",
  note: "notes",
  org: "org_name",
  organisation: "org_name",
  organization: "org_name",
  organization_name: "org_name",
  organization_website: "org_website",
  person: "name",
  phone_number: "phone",
  position: "role",
  tel: "phone",
  telephone: "phone",
  title: "role",
  website: "org_website",
  whatsapp: "phone",
};

const HEADER_NOISE = /[^a-z0-9_]/g;
const HEADER_SEPARATORS = /[\s\-./]+/g;

/** "Next action (date)" → "next_action_date". */
export const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(HEADER_SEPARATORS, "_")
    .replace(HEADER_NOISE, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

interface HeaderMap<Column extends string> {
  /** Headers mapped to a column already taken (the first one counts). */
  duplicates: string[];
  index: Partial<Record<Column, number>>;
  unknown: string[];
}

/** Which cell holds each column, from the header row. */
export const mapHeaders = <Column extends string>(
  headers: readonly string[],
  columns: readonly Column[],
  aliases: Record<string, Column>
): HeaderMap<Column> => {
  const result: HeaderMap<Column> = { duplicates: [], index: {}, unknown: [] };
  headers.forEach((header, position) => {
    const key = normalizeHeader(header);
    if (!key) {
      return;
    }
    const column = (columns as readonly string[]).includes(key)
      ? (key as Column)
      : aliases[key];
    if (!column) {
      result.unknown.push(header.trim());
    } else if (result.index[column] === undefined) {
      result.index[column] = position;
    } else {
      result.duplicates.push(header.trim());
    }
  });
  return result;
};

const STAGE_WORDS: Record<string, PartnerStage> = {
  active: "partner",
  contacted: "contacted",
  declined: "declined",
  emailed: "contacted",
  in_talks: "talking",
  lead: "prospect",
  lost: "declined",
  meeting: "talking",
  negotiating: "talking",
  new: "prospect",
  no: "declined",
  not_interested: "declined",
  on_hold: "paused",
  partner: "partner",
  paused: "paused",
  prospect: "prospect",
  reached_out: "contacted",
  rejected: "declined",
  replied: "talking",
  sent: "contacted",
  signed: "partner",
  talking: "talking",
  to_contact: "prospect",
  won: "partner",
};

/** A stage from the sheet's words; null when it isn't one we know. */
export const parseStage = (value: string): PartnerStage | null =>
  STAGE_WORDS[normalizeHeader(value)] ?? null;

const KIND_WORDS: Record<string, PartnerKind> = {
  business: "company",
  centre: "cultural_centre",
  charity: "ngo",
  college: "university",
  consulate: "embassy",
  corporate: "company",
  cultural_center: "cultural_centre",
  embassy: "embassy",
  gov: "government",
  high_school: "school",
  ministry: "government",
  non_profit: "ngo",
  nonprofit: "ngo",
  organiser: "program_organizer",
  organizer: "program_organizer",
  press: "media",
  program_organiser: "program_organizer",
  programme_organiser: "program_organizer",
  programme_organizer: "program_organizer",
  uni: "university",
};

/**
 * A kind from the sheet: one of ours or a known synonym; anything else is
 * `other` (and the preview says so). Null for a blank cell.
 */
export const parseKind = (
  value: string
): { kind: PartnerKind; known: boolean } | null => {
  const key = normalizeHeader(value);
  if (!key) {
    return null;
  }
  if ((partnerKinds as readonly string[]).includes(key)) {
    return { kind: key as PartnerKind, known: true };
  }
  const kind = KIND_WORDS[key];
  return kind ? { kind, known: true } : { kind: "other", known: false };
};

const PRIORITY_WORDS: Record<string, Priority> = {
  "1": 1,
  "2": 2,
  "3": 3,
  h: 1,
  high: 1,
  l: 3,
  low: 3,
  m: 2,
  med: 2,
  medium: 2,
  normal: 2,
  p1: 1,
  p2: 2,
  p3: 3,
};

export const parsePriority = (value: string): Priority | null =>
  PRIORITY_WORDS[normalizeHeader(value)] ?? null;

const TAG_SPLIT = /[,،;|]/;

/** Tags from a cell: lower-cased, de-duplicated. */
export const parseTags = (value: string) => [
  ...new Set(
    value
      .split(TAG_SPLIT)
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  ),
];

export type ImportProblem =
  | "cityTooLong"
  | "countryInvalid"
  | "dateInvalid"
  | "dateWithoutNextAction"
  | "duplicateInFile"
  | "emailInvalid"
  | "nameArTooLong"
  | "nameMissing"
  | "nameTooLong"
  | "nextActionTooLong"
  | "nextActionWithoutDate"
  | "notesTooLong"
  | "orgMissing"
  | "phoneInvalid"
  | "priorityInvalid"
  | "roleTooLong"
  | "sourceMissing"
  | "sourceTooLong"
  | "sourceUrlInvalid"
  | "stageUnknown"
  | "tagTooLong"
  | "tooManyTags"
  | "websiteInvalid";

export type ImportWarning = "kindUnknown";

/** One organization from the sheet; null means the cell was blank. */
export interface ImportOrg {
  city: string | null;
  country: string | null;
  email: string | null;
  kind: PartnerKind | null;
  name: string;
  nameAr: string | null;
  nextAction: string | null;
  nextActionOn: string | null;
  notes: string | null;
  priority: Priority | null;
  sourceUrl: string | null;
  stage: PartnerStage | null;
  tags: string[];
  website: string | null;
}

export interface OrgSheetRow {
  errors: ImportProblem[];
  /** The sheet's line number (the header is line 1). */
  line: number;
  org: ImportOrg;
  warnings: ImportWarning[];
}

export type SheetProblem =
  | "empty"
  | "noNameColumn"
  | "noOrgColumn"
  | "noPersonColumns";

export interface Sheet<Row> {
  duplicateColumns: string[];
  problem: SheetProblem | null;
  rows: Row[];
  unknownColumns: string[];
}

const cellReader =
  <Column extends string>(
    cells: readonly string[],
    index: Partial<Record<Column, number>>
  ) =>
  (column: Column) => {
    const position = index[column];
    return position === undefined ? "" : (cells[position] ?? "").trim();
  };

const isBlankRow = (cells: readonly string[]) =>
  cells.every((cell) => cell.trim() === "");

/** Collects a row's problems while its cells are read. */
const problems = () => {
  const errors: ImportProblem[] = [];
  return {
    errors,
    /** An optional cell read by `parse`: blank is null, unreadable is a problem. */
    parsed: <T>(
      value: string,
      parse: (cell: string) => T | null,
      problem: ImportProblem
    ) => {
      if (!value) {
        return null;
      }
      const result = parse(value);
      if (result === null) {
        errors.push(problem);
      }
      return result;
    },
    /** A cell that must not be blank (nor longer than `max`). */
    required: (
      value: string,
      max: number,
      missing: ImportProblem,
      long: ImportProblem
    ) => {
      if (!value) {
        errors.push(missing);
      } else if (value.length > max) {
        errors.push(long);
      }
      return value;
    },
    /** An optional text cell: blank is null. */
    text: (value: string, max: number, problem: ImportProblem) => {
      if (value.length > max) {
        errors.push(problem);
      }
      return value || null;
    },
    when: (condition: boolean, problem: ImportProblem) => {
      if (condition) {
        errors.push(problem);
      }
    },
  };
};

const emailOrNull = (value: string) => (isEmail(value) ? value : null);

/** One organization row: its values, what's wrong and what was guessed. */
const readOrgRow = (
  cell: (column: OrgColumn) => string,
  line: number
): OrgSheetRow => {
  const check = problems();
  const name = check.required(cell("name"), 200, "nameMissing", "nameTooLong");
  const nameAr = check.text(cell("name_ar"), 200, "nameArTooLong");
  const kind = parseKind(cell("kind"));
  const country = check.parsed(cell("country"), parseCountry, "countryInvalid");
  const city = check.text(cell("city"), 120, "cityTooLong");
  const website = check.parsed(
    cell("website"),
    (value) => parseUrl(value, 500),
    "websiteInvalid"
  );
  const email = check.parsed(cell("email"), emailOrNull, "emailInvalid");
  const stage = check.parsed(cell("stage"), parseStage, "stageUnknown");
  const priority = check.parsed(
    cell("priority"),
    parsePriority,
    "priorityInvalid"
  );
  const nextAction = check.text(cell("next_action"), 300, "nextActionTooLong");
  const dateCell = cell("next_action_on");
  const nextActionOn = check.parsed(dateCell, parseIsoDate, "dateInvalid");
  check.when(Boolean(nextAction) && !dateCell, "nextActionWithoutDate");
  check.when(Boolean(dateCell) && !nextAction, "dateWithoutNextAction");
  const sourceUrl = check.parsed(
    cell("source_url"),
    (value) => parseUrl(value, 1000),
    "sourceUrlInvalid"
  );
  const tagList = parseTags(cell("tags"));
  check.when(tagList.length > 20, "tooManyTags");
  check.when(
    tagList.some((tag) => tag.length > 40),
    "tagTooLong"
  );
  const notes = check.text(cell("notes"), 10_000, "notesTooLong");
  return {
    errors: check.errors,
    line,
    org: {
      city,
      country,
      email,
      kind: kind?.kind ?? null,
      name,
      nameAr,
      nextAction,
      nextActionOn,
      notes,
      priority,
      sourceUrl,
      stage,
      tags: tagList,
      website,
    },
    warnings: kind && !kind.known ? ["kindUnknown"] : [],
  };
};

/**
 * Reads the organizations sheet (CSV text): maps the headers, checks every
 * row, and marks rows that repeat an earlier one: the same website, or,
 * for a row without a website, the same name.
 */
export const parseOrgSheet = (input: string): Sheet<OrgSheetRow> => {
  const rows = parseCsv(input);
  const [headers, ...body] = rows;
  if (!headers || body.every(isBlankRow)) {
    return {
      duplicateColumns: [],
      problem: "empty",
      rows: [],
      unknownColumns: [],
    };
  }
  const map = mapHeaders(headers, ORG_COLUMNS, ORG_ALIASES);
  if (map.index.name === undefined) {
    return {
      duplicateColumns: map.duplicates,
      problem: "noNameColumn",
      rows: [],
      unknownColumns: map.unknown,
    };
  }
  const seenWebsites = new Set<string>();
  const seenNames = new Set<string>();
  const result: OrgSheetRow[] = [];
  body.forEach((cells, position) => {
    if (isBlankRow(cells)) {
      return;
    }
    const row = readOrgRow(cellReader(cells, map.index), position + 2);
    const { name, website } = row.org;
    const duplicate = website
      ? seenWebsites.has(websiteKey(website))
      : Boolean(name) && seenNames.has(name);
    if (duplicate) {
      row.errors.push("duplicateInFile");
    }
    if (website) {
      seenWebsites.add(websiteKey(website));
    }
    if (name) {
      seenNames.add(name);
    }
    result.push(row);
  });
  return {
    duplicateColumns: map.duplicates,
    problem: null,
    rows: result,
    unknownColumns: map.unknown,
  };
};

export interface ImportPerson {
  email: string | null;
  name: string;
  notes: string | null;
  orgName: string | null;
  orgWebsite: string | null;
  phone: string | null;
  role: string | null;
  source: string;
}

export interface PersonSheetRow {
  errors: ImportProblem[];
  line: number;
  person: ImportPerson;
}

const personKey = (person: ImportPerson) =>
  [
    person.orgWebsite ? websiteKey(person.orgWebsite) : `n:${person.orgName}`,
    person.email ? person.email.toLowerCase() : `n:${person.name}`,
  ].join("|");

const phoneOrNull = (value: string) => (isPhone(value) ? value : null);

/** One person row: its values and what's wrong. */
const readPersonRow = (
  cell: (column: PeopleColumn) => string,
  line: number
): PersonSheetRow => {
  const check = problems();
  const websiteCell = cell("org_website");
  const orgWebsite = check.parsed(
    websiteCell,
    (value) => parseUrl(value, 500),
    "websiteInvalid"
  );
  const orgName = cell("org_name") || null;
  check.when(!(websiteCell || orgName), "orgMissing");
  const name = check.required(cell("name"), 200, "nameMissing", "nameTooLong");
  const role = check.text(cell("role"), 200, "roleTooLong");
  const email = check.parsed(cell("email"), emailOrNull, "emailInvalid");
  const phone = check.parsed(
    latinDigits(cell("phone")),
    phoneOrNull,
    "phoneInvalid"
  );
  const source = check.required(
    cell("source"),
    300,
    "sourceMissing",
    "sourceTooLong"
  );
  const notes = check.text(cell("notes"), 2000, "notesTooLong");
  return {
    errors: check.errors,
    line,
    person: { email, name, notes, orgName, orgWebsite, phone, role, source },
  };
};

/**
 * Reads the optional people sheet: each row names its organization by
 * website or by exact name, and where the contact came from.
 */
export const parsePeopleSheet = (input: string): Sheet<PersonSheetRow> => {
  const rows = parseCsv(input);
  const [headers, ...body] = rows;
  if (!headers || body.every(isBlankRow)) {
    return {
      duplicateColumns: [],
      problem: "empty",
      rows: [],
      unknownColumns: [],
    };
  }
  const map = mapHeaders(headers, PEOPLE_COLUMNS, PEOPLE_ALIASES);
  const sheet = (problem: SheetProblem) => ({
    duplicateColumns: map.duplicates,
    problem,
    rows: [],
    unknownColumns: map.unknown,
  });
  if (map.index.org_website === undefined && map.index.org_name === undefined) {
    return sheet("noOrgColumn");
  }
  if (map.index.name === undefined || map.index.source === undefined) {
    return sheet("noPersonColumns");
  }
  const seen = new Set<string>();
  const result: PersonSheetRow[] = [];
  body.forEach((cells, position) => {
    if (isBlankRow(cells)) {
      return;
    }
    const row = readPersonRow(cellReader(cells, map.index), position + 2);
    const key = personKey(row.person);
    if (seen.has(key)) {
      row.errors.push("duplicateInFile");
    }
    seen.add(key);
    result.push(row);
  });
  return {
    duplicateColumns: map.duplicates,
    problem: null,
    rows: result,
    unknownColumns: map.unknown,
  };
};

export interface ExistingOrg {
  id: string;
  name: string;
  tags: string[];
  website: string | null;
}

/** The columns an imported organization sets: blank cells are left out. */
export type OrgColumns = TablesUpdate<"partner_orgs"> & { name: string };

export const importColumns = (
  org: ImportOrg,
  /** Leave the website out (the organization already has its own). */
  keepWebsite = false
): OrgColumns => {
  const columns: OrgColumns = { name: org.name };
  if (org.nameAr !== null) {
    columns.name_ar = org.nameAr;
  }
  if (org.kind !== null) {
    columns.kind = org.kind;
  }
  if (org.country !== null) {
    columns.country = org.country;
  }
  if (org.city !== null) {
    columns.city = org.city;
  }
  if (org.website !== null && !keepWebsite) {
    columns.website = org.website;
  }
  if (org.email !== null) {
    columns.email = org.email;
  }
  if (org.stage !== null) {
    columns.stage = org.stage;
  }
  if (org.priority !== null) {
    columns.priority = org.priority;
  }
  if (org.sourceUrl !== null) {
    columns.source_url = org.sourceUrl;
  }
  if (org.notes !== null) {
    columns.notes = org.notes;
  }
  if (org.nextAction && org.nextActionOn) {
    columns.next_action = org.nextAction;
    columns.next_action_on = org.nextActionOn;
  }
  if (org.tags.length > 0) {
    columns.tags = org.tags;
  }
  return columns;
};

/** The existing organization a row updates: same website, else same name. */
export const matchOrg = (
  org: Pick<ImportOrg, "name" | "website">,
  byWebsite: ReadonlyMap<string, ExistingOrg>,
  byName: ReadonlyMap<string, ExistingOrg>
) => {
  if (org.website) {
    const match = byWebsite.get(websiteKey(org.website));
    if (match) {
      return match;
    }
  }
  const named = byName.get(org.name);
  // A namesake with another website is another organization.
  if (named && !(org.website && named.website)) {
    return named;
  }
  return null;
};

export interface ImportPlan {
  inserts: { columns: OrgColumns; line: number }[];
  updates: { columns: OrgColumns; id: string; line: number }[];
}

/**
 * What importing the valid rows does: each updates the organization it
 * matches (only the cells that aren't blank; tags are added to its own,
 * up to 20) or adds a new one. Rows with errors are skipped.
 */
export const planImport = (
  rows: readonly OrgSheetRow[],
  existing: readonly ExistingOrg[]
): ImportPlan => {
  const byWebsite = new Map<string, ExistingOrg>();
  const byName = new Map<string, ExistingOrg>();
  for (const org of existing) {
    if (org.website) {
      byWebsite.set(websiteKey(org.website), org);
    }
    if (!byName.has(org.name)) {
      byName.set(org.name, org);
    }
  }
  const plan: ImportPlan = { inserts: [], updates: [] };
  for (const row of rows) {
    if (row.errors.length > 0) {
      continue;
    }
    const match = matchOrg(row.org, byWebsite, byName);
    // An organization keeps its own website once it has one.
    const columns = importColumns(row.org, Boolean(match?.website));
    if (match) {
      if (row.org.tags.length > 0) {
        columns.tags = [...new Set([...match.tags, ...row.org.tags])].slice(
          0,
          20
        );
      }
      plan.updates.push({ columns, id: match.id, line: row.line });
    } else {
      plan.inserts.push({ columns, line: row.line });
    }
  }
  return plan;
};

/** One contact at one organization: by email, or by name without one. */
export const contactKey = (
  orgId: string,
  person: { email: string | null; name: string }
) =>
  `${orgId}|${person.email ? person.email.toLowerCase() : `n:${person.name}`}`;

/** The organization a person row belongs to, among those now in the CRM. */
export const personOrg = (
  person: Pick<ImportPerson, "orgName" | "orgWebsite">,
  orgs: readonly ExistingOrg[]
) => {
  if (person.orgWebsite) {
    const key = websiteKey(person.orgWebsite);
    const match = orgs.find(
      (org) => org.website && websiteKey(org.website) === key
    );
    if (match) {
      return match;
    }
  }
  return person.orgName
    ? (orgs.find((org) => org.name === person.orgName) ?? null)
    : null;
};
