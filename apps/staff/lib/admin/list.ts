export const PAGE_SIZE = 25;

export type SearchParams = Record<string, string | string[] | undefined>;

/** One value of a query parameter (the first when repeated). */
export const param = (params: SearchParams, key: string): string => {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};

/** A query parameter that must be one of `allowed`; otherwise null. */
export const oneOf = <T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[]
): T | null => {
  const value = param(params, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
};

/** The requested page (1-based) and its row range for `.range()`. */
export const pageRange = (params: SearchParams, size = PAGE_SIZE) => {
  const requested = Number.parseInt(param(params, "page"), 10);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const from = (page - 1) * size;
  return { from, page, size, to: from + size - 1 };
};

export const pageCount = (count: number | null, size = PAGE_SIZE) =>
  Math.max(1, Math.ceil((count ?? 0) / size));

/** The current query string with some parameters changed (null removes). */
export const withParams = (
  params: SearchParams,
  changes: Record<string, string | number | null>
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) {
      query.set(key, first);
    }
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") {
      query.delete(key);
    } else {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
};

const LIKE_SPECIAL = /[\\%_,()]/g;

/**
 * Text for a PostgREST `ilike` filter: wildcards and the characters that
 * would break an `or=(…)` filter are removed.
 */
export const searchTerm = (value: string) =>
  value.replace(LIKE_SPECIAL, " ").trim().slice(0, 100);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID.test(value);
