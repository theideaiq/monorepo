import { z } from "zod";
import { fromBaghdadInput } from "./dates";

/**
 * Turns FormData into a plain object for zod. Fields named `key[]` become
 * arrays under `key`; files are skipped (uploads go to Storage first and the
 * form only carries their paths).
 */
export const formObject = (formData: FormData) => {
  const result: Record<string, string | string[]> = {};

  for (const key of new Set(formData.keys())) {
    const values = formData
      .getAll(key)
      .filter((value): value is string => typeof value === "string");

    if (key.endsWith("[]")) {
      result[key.slice(0, -2)] = values;
    } else if (values.length > 0) {
      result[key] = values.at(-1) as string;
    }
  }

  return result;
};

const trimmed = z.string().trim();

/** A required single-line or multi-line text. */
export const text = (max: number) => trimmed.min(1).max(max);

/** Optional text: empty becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const INTEGER = /^-?\d+$/;

const integerString = trimmed
  .transform((value) => value.replaceAll(",", ""))
  .pipe(z.string().regex(INTEGER))
  .transform(Number);

/** A whole number (amounts in IQD, counts). */
export const int = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  integerString.pipe(z.number().int().min(min).max(max));

/** An optional whole number: empty becomes null. */
export const optionalInt = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(z.union([z.null(), int(min, max)]));

/** A decimal number, e.g. a percentage or a share price. */
export const optionalDecimal = (min = 0) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value.replaceAll(",", "")) : null))
    .pipe(z.union([z.null(), z.number().min(min)]));

/** A required decimal number within a range, e.g. a rate in percent. */
export const decimalIn = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => Number(value.replaceAll(",", "")))
    .pipe(z.number().min(min).max(max));

/** A checkbox: present ("on") means true. */
export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const uuid = z.uuid();

export const optionalUuid = z
  .string()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), z.uuid()]));

export const slug = trimmed
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(120);

/** A `datetime-local` value read as Baghdad time, as an ISO timestamp. */
export const optionalDateTime = z
  .string()
  .optional()
  .transform((value, context) => {
    if (!value) {
      return null;
    }
    const iso = fromBaghdadInput(value);
    if (!iso) {
      context.addIssue({ code: "custom", message: "invalid date" });
      return z.NEVER;
    }
    return iso;
  });

export const dateTime = optionalDateTime.pipe(z.string());

/** A `date` input (YYYY-MM-DD). */
export const date = trimmed.regex(/^\d{4}-\d{2}-\d{2}$/);

export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), date]));

/** One item per line, blank lines dropped. */
export const lines = (maxItems: number, maxLength: number) =>
  z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().max(maxLength)).max(maxItems));

const TAG_SEPARATOR = /[,،]/;

/** Comma-separated tags, lower-cased and de-duplicated. */
export const tags = z
  .string()
  .optional()
  .transform((value) => [
    ...new Set(
      (value ?? "")
        .split(TAG_SEPARATOR)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ])
  .pipe(z.array(z.string().max(40)).max(20));

/**
 * Key/value rows (`key[]` and `value[]` fields) as an object, e.g. product
 * details or variant attributes. Rows without a key are dropped.
 */
export const keyValues = (keys: string[] = [], values: string[] = []) => {
  const entries: [string, string][] = [];
  keys.forEach((key, index) => {
    const name = key.trim();
    const value = (values[index] ?? "").trim();
    if (name && value) {
      entries.push([name.slice(0, 60), value.slice(0, 300)]);
    }
  });
  return Object.fromEntries(entries);
};

const STORAGE_PATH = /^(?!.*\.\.)[\w!.()+, /-]{1,700}$/;

/** A storage object path made by `objectPath` (no "..", sane characters). */
export const storagePath = z.string().trim().regex(STORAGE_PATH);

export const optionalStoragePath = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .pipe(z.union([z.null(), storagePath]));

/** Uploaded file paths (`name[]`), empty entries dropped. */
export const storagePaths = (max: number) =>
  z
    .array(z.string())
    .optional()
    .transform((values) => (values ?? []).map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(storagePath).max(max));

/** One of a list of values. */
export const choice = <const T extends readonly [string, ...string[]]>(
  values: T
) => z.enum(values);
