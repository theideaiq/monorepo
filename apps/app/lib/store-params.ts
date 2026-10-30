/**
 * A catalogue grid's state lives in the URL (?category=&sub=&format=&max=
 * &stock=&plus=&q=&sort=&page=), so every view is linkable and works
 * without JavaScript.
 */

export const STORE_PAGE_SIZE = 12;

export const storeSorts = ["newest", "price-asc", "price-desc"] as const;
export type StoreSort = (typeof storeSorts)[number];

/** The price filter's steps: "Up to 25,000", … (IQD). */
export const PRICE_STEPS = [25_000, 50_000, 100_000, 250_000] as const;

export interface StoreQuery {
  category?: string;
  /** A variant format (CD, Vinyl, …), as stored in `attributes.Format`. */
  format?: string;
  /** Priced at or under this (one of `PRICE_STEPS`). */
  max?: number;
  page: number;
  /** Only products in Plus. */
  plus?: boolean;
  q?: string;
  sort: StoreSort;
  /** Only products in stock. */
  stock?: boolean;
  /** A subcategory of the category shelf. */
  sub?: string;
}

type RawParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PAGE = 500;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const slug = (value: string | undefined) => {
  const clean = value?.trim();
  return clean && SLUG.test(clean) ? clean : undefined;
};

/** Parses untrusted search params into a valid query, dropping bad values. */
export const parseStoreQuery = (params: RawParams): StoreQuery => {
  const format = first(params.format)?.trim().slice(0, 40);
  const q = first(params.q)?.trim().slice(0, 100);
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const max = Number.parseInt(first(params.max) ?? "", 10);

  return {
    category: slug(first(params.category)),
    format: format || undefined,
    max: (PRICE_STEPS as readonly number[]).includes(max) ? max : undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
    plus: first(params.plus) === "1" || undefined,
    q: q || undefined,
    sort: storeSorts.includes(sort as StoreSort)
      ? (sort as StoreSort)
      : "newest",
    stock: first(params.stock) === "1" || undefined,
    sub: slug(first(params.sub)),
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
  if (next.sub) {
    params.set("sub", next.sub);
  }
  if (next.format) {
    params.set("format", next.format);
  }
  if (next.max) {
    params.set("max", String(next.max));
  }
  if (next.stock) {
    params.set("stock", "1");
  }
  if (next.plus) {
    params.set("plus", "1");
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

/**
 * The listing a grid asks for: its page (one extra row tells whether there
 * is a next one), the subcategory or category, and the filters.
 */
export const gridFilters = (query: StoreQuery, category?: string) => ({
  category: query.sub ?? category ?? query.category,
  format: query.format,
  inStock: query.stock,
  kind: query.plus ? ("rental" as const) : ("sale" as const),
  limit: STORE_PAGE_SIZE + 1,
  maxPrice: query.max,
  offset: (query.page - 1) * STORE_PAGE_SIZE,
  search: query.q,
  sort: query.sort,
});

/** How many filters are on (for "Filter (n)"); the sort isn't one. */
export const activeFilterCount = (query: StoreQuery) =>
  [query.sub, query.format, query.max, query.stock, query.plus].filter(Boolean)
    .length;
