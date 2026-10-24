import { Constants, type Enums } from "@repo/database";
import { z } from "zod";
import { date, int, optionalDecimal, optionalText, text } from "./forms";
import { oneOf, type SearchParams } from "./list";

export type Scenario = Enums<"ledger_scenario">;

/** Actual books, plus forecast and budget entries kept apart from them. */
export const scenarios = Constants.public.Enums.ledger_scenario;

/** The `scenario` query parameter; the actual books unless another is chosen. */
export const scenarioFrom = (params: SearchParams): Scenario =>
  oneOf(params, "scenario", scenarios) ?? "actual";

export const BASE_CURRENCY = "IQD";

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/);

/**
 * The header of a new journal entry. Line amounts are always IQD; an entry
 * booked from another currency records that currency and the rate used
 * (IQD per unit) for reference. IQD entries always have a rate of 1, as the
 * database requires.
 */
export const journalEntrySchema = z
  .object({
    // Lines, one entry per row of the form (`name[]` fields).
    accountId: z.array(z.string()).default([]),
    credit: z.array(z.string()).default([]),
    // Header.
    currency: currencyCode.default(BASE_CURRENCY),
    debit: z.array(z.string()).default([]),
    description: text(500),
    dimensions: z.array(z.string().max(5000)).default([]),
    entryDate: date,
    exchangeRate: optionalDecimal(0),
    memo: z.array(z.string().max(300)).default([]),
    reference: optionalText(255),
    scenario: z.enum(scenarios).default("actual"),
  })
  .refine(
    (entry) =>
      entry.currency === BASE_CURRENCY ||
      (entry.exchangeRate !== null && entry.exchangeRate > 0),
    { path: ["exchangeRate"] }
  )
  .transform((entry) => ({
    ...entry,
    exchangeRate:
      entry.currency === BASE_CURRENCY ? 1 : (entry.exchangeRate as number),
  }));

const MAX_DIMENSIONS = 10;

/**
 * One line's report dimensions, sent by the journal form as a JSON object
 * of short text pairs, e.g. {"product_line": "plus"}. Blank keys or values
 * are dropped; anything that isn't such an object is rejected (null).
 */
export const parseDimensions = (
  value: string | undefined
): Record<string, string> | null => {
  if (!value?.trim()) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const entries: [string, string][] = [];
  for (const [key, raw] of Object.entries(parsed)) {
    if (typeof raw !== "string") {
      return null;
    }
    const name = key.trim();
    const label = raw.trim();
    if (!(name && label)) {
      continue;
    }
    if (name.length > 60 || label.length > 120) {
      return null;
    }
    entries.push([name, label]);
  }
  if (entries.length > MAX_DIMENSIONS) {
    return null;
  }
  return Object.fromEntries(entries);
};

/**
 * The first day (YYYY-MM-DD) of the fiscal year containing `month` (any
 * YYYY-MM-DD in that month), for a fiscal year starting in `startMonth`
 * (1 = January).
 */
export const fiscalYearStart = (month: string, startMonth: number) => {
  const [year, current] = month.split("-").map(Number) as [number, number];
  const startYear = current >= startMonth ? year : year - 1;
  return `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
};

export const financialSettingsSchema = z.object({
  baseCurrency: currencyCode,
  corporateTaxRate: optionalDecimal(0).pipe(z.number().max(100)),
  fiscalYearStartMonth: int(1, 12),
  vatRate: optionalDecimal(0).pipe(z.number().max(100)),
});
