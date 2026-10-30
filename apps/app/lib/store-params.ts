/**
 * The store catalog's state lives in the URL (?category=&format=&q=&sort=&page=), so
 * every view is linkable and works without JavaScript.
 */

export const STORE_PAGE_SIZE = 12;

export const storeSorts = ["newest", "price-asc", "price-desc"] as const;
export type StoreSort = (typeof storeSorts)[number];

export interface StoreQuery {
  category?: string;
  /** A variant format (CD, Vinyl, …), as stored in `attributes.Format`. */
  format?: string;
  page: number;
  q?: string;
  sort: StoreSort;
}

type RawParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PAGE = 500;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Parses untrusted search params into a valid query, dropping bad values. */
export const parseStoreQuery = (params: RawParams): StoreQuery => {
  const category = first(params.category)?.trim();
  const format = first(params.format)?.trim().slice(0, 40);
  const q = first(params.q)?.trim().slice(0, 100);
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    category: category && SLUG.test(category) ? category : undefined,
    format: format || undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
    q: q || undefined,
    sort: storeSorts.includes(sort as StoreSort)
      ? (sort as StoreSort)
      : "newest",
  };
};

/** The search string for a query, omitting defaults ("" for the first page). */
export const storeQueryString = (
  query: StoreQuery,
  changes: Partial<StoreQuery> = {}
) => {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  if (next.category) {
    params.set("category", next.category);
  }
  if (next.format) {
    params.set("format", next.format);
  }
  if (next.q) {
    params.set("q", next.q);
  }
  if (next.sort !== "newest") {
    params.set("sort", next.sort);
  }
  if (next.page > 1) {
    params.set("page", String(next.page));
  }
  const search = params.toString();
  return search ? `?${search}` : "";
};
