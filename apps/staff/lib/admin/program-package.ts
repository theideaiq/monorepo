/**
 * A program package's itinerary and costs as the program form sends them
 * (`key[]` rows), and the same checks the database runs on them
 * (`private.valid_program_itinerary` and `private.valid_program_costs`,
 * migration 20270327000000).
 */

export interface ItineraryStep {
  day: number;
  detail_ar?: string;
  detail_en?: string;
  title_ar: string;
  title_en: string;
}

export interface CostLine {
  /** IQD, a multiple of 250; null when it varies or isn't known yet. */
  amount: number | null;
  /** In the package price; otherwise paid on top. */
  included: boolean;
  label_ar: string;
  label_en: string;
}

export const MAX_ITINERARY_STEPS = 60;
export const MAX_COST_LINES = 40;

const WHOLE = /^\d+$/;

/** A whole number typed in a field (commas allowed), or NaN. */
const wholeNumber = (value: string) => {
  const clean = value.trim().replaceAll(",", "");
  return WHOLE.test(clean) ? Number(clean) : Number.NaN;
};

const at = (values: string[] | undefined, index: number) =>
  (values?.[index] ?? "").trim();

/** The itinerary rows filled in, in day order (blank rows dropped). */
export const itineraryOf = (fields: {
  day?: string[];
  detailAr?: string[];
  detailEn?: string[];
  titleAr?: string[];
  titleEn?: string[];
}): ItineraryStep[] => {
  const count = Math.max(
    fields.day?.length ?? 0,
    fields.titleAr?.length ?? 0,
    fields.titleEn?.length ?? 0,
    fields.detailAr?.length ?? 0,
    fields.detailEn?.length ?? 0
  );
  const steps: ItineraryStep[] = [];
  for (let index = 0; index < count; index += 1) {
    const day = at(fields.day, index);
    const titleAr = at(fields.titleAr, index);
    const titleEn = at(fields.titleEn, index);
    const detailAr = at(fields.detailAr, index);
    const detailEn = at(fields.detailEn, index);
    if (!(day || titleAr || titleEn || detailAr || detailEn)) {
      continue;
    }
    steps.push({
      day: wholeNumber(day),
      title_ar: titleAr,
      title_en: titleEn,
      ...(detailAr ? { detail_ar: detailAr } : {}),
      ...(detailEn ? { detail_en: detailEn } : {}),
    });
  }
  // A stable sort keeps the order typed within a day.
  return steps.sort((a, b) => a.day - b.day);
};

const between = (value: string | undefined, min: number, max: number) =>
  (value ?? "").length >= min && (value ?? "").length <= max;

/** Whether the database accepts this itinerary. */
export const validItinerary = (steps: ItineraryStep[]) =>
  steps.length <= MAX_ITINERARY_STEPS &&
  steps.every(
    (step) =>
      Number.isInteger(step.day) &&
      step.day >= 1 &&
      step.day <= 365 &&
      between(step.title_ar, 1, 200) &&
      between(step.title_en, 1, 200) &&
      between(step.detail_ar, 0, 1000) &&
      between(step.detail_en, 0, 1000)
  );

/** The cost rows filled in, in the order typed (blank rows dropped). */
export const costsOf = (fields: {
  amount?: string[];
  included?: string[];
  labelAr?: string[];
  labelEn?: string[];
}): CostLine[] => {
  const count = Math.max(
    fields.labelAr?.length ?? 0,
    fields.labelEn?.length ?? 0,
    fields.amount?.length ?? 0
  );
  const lines: CostLine[] = [];
  for (let index = 0; index < count; index += 1) {
    const labelAr = at(fields.labelAr, index);
    const labelEn = at(fields.labelEn, index);
    const amount = at(fields.amount, index);
    if (!(labelAr || labelEn || amount)) {
      continue;
    }
    lines.push({
      amount: amount ? wholeNumber(amount) : null,
      included: at(fields.included, index) === "yes",
      label_ar: labelAr,
      label_en: labelEn,
    });
  }
  return lines;
};

/** Whether the database accepts these costs. */
export const validCosts = (lines: CostLine[]) =>
  lines.length <= MAX_COST_LINES &&
  lines.every(
    (line) =>
      between(line.label_ar, 1, 200) &&
      between(line.label_en, 1, 200) &&
      typeof line.included === "boolean" &&
      (line.amount === null ||
        (Number.isSafeInteger(line.amount) &&
          line.amount >= 0 &&
          line.amount % 250 === 0))
  );
