/**
 * A program package's itinerary and costs as stored on `programs`
 * (migration 20270327000000), read defensively: before the migration (or
 * on the page's data fallback) the columns are missing and read as [].
 */

export interface ItineraryStep {
  day: number;
  detail_ar?: string | null;
  detail_en?: string | null;
  title_ar: string;
  title_en: string;
}

export interface CostLine {
  /** IQD; null when it varies or isn't known yet. */
  amount?: number | null;
  /** In the package price; otherwise paid on top. */
  included: boolean;
  label_ar: string;
  label_en: string;
}

export interface CostSummary {
  /** Paid on top, in the order entered. */
  extras: CostLine[];
  /** Part of the package price, in the order entered. */
  included: CostLine[];
  /** The known amounts paid on top, added up. */
  knownExtra: number;
  /** Some extra cost has no amount (it varies), so the total is a minimum. */
  someUnknown: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The itinerary in day order; anything that isn't a list reads as none. */
export const itineraryOf = (value: unknown): ItineraryStep[] =>
  Array.isArray(value)
    ? (value as unknown[])
        .filter(
          (step): step is ItineraryStep =>
            isObject(step) &&
            typeof step.day === "number" &&
            typeof step.title_ar === "string" &&
            typeof step.title_en === "string"
        )
        .sort((a, b) => a.day - b.day)
    : [];

/** The cost lines; anything that isn't a list reads as none. */
export const costsOf = (value: unknown): CostLine[] =>
  Array.isArray(value)
    ? (value as unknown[]).filter(
        (line): line is CostLine =>
          isObject(line) &&
          typeof line.included === "boolean" &&
          typeof line.label_ar === "string" &&
          typeof line.label_en === "string"
      )
    : [];

/** What's in the package price, what's on top and how much is known. */
export const costSummary = (value: unknown): CostSummary => {
  const lines = costsOf(value);
  const extras = lines.filter((line) => !line.included);
  return {
    extras,
    included: lines.filter((line) => line.included),
    knownExtra: extras.reduce(
      (sum, line) => sum + (typeof line.amount === "number" ? line.amount : 0),
      0
    ),
    someUnknown: extras.some((line) => typeof line.amount !== "number"),
  };
};

/**
 * How to say what's paid on top: nothing on top, an exact total, at least
 * the known total (some amounts vary), or only that some costs vary.
 */
export const onTopKind = (
  summary: CostSummary
): "atLeast" | "exact" | "none" | "varies" => {
  if (summary.extras.length === 0) {
    return "none";
  }
  if (!summary.someUnknown) {
    return "exact";
  }
  return summary.knownExtra > 0 ? "atLeast" : "varies";
};
