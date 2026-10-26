/**
 * "Find picture": cover candidates for a product, looked up from the staff
 * member's browser (each API allows CORS). Records, CDs and cassettes come
 * from MusicBrainz and the Cover Art Archive, books from Open Library, and
 * everything else (games, films, tech) from Wikipedia. Staff confirm a
 * candidate before it is saved into the product's images.
 */
import { isRemoteCatalogImage } from "./catalog-images";

export type CoverStrategy = "books" | "music" | "wikipedia";

const MUSIC_CATEGORIES = new Set(["music"]);
const BOOK_CATEGORIES = new Set(["books"]);

/** Which source to ask, by category slug. */
export const coverStrategy = (
  categorySlug: string | null | undefined
): CoverStrategy => {
  if (categorySlug && MUSIC_CATEGORIES.has(categorySlug)) {
    return "music";
  }
  if (categorySlug && BOOK_CATEGORIES.has(categorySlug)) {
    return "books";
  }
  return "wikipedia";
};

export interface CoverProduct {
  details: unknown;
  name_en: string;
}

export interface CoverQuery {
  /** Album artist (music) or author (books). */
  creator?: string;
  title: string;
}

// "GUTS (Signed Card) (Cassette)" → "GUTS"; the catalog names formats and
// editions in trailing parentheses.
const TRAILING_PARENTHESES = /\s*\([^()]*\)\s*$/;
// Names are "Artist – Title" (music) or "Title – Author" (books).
const NAME_SEPARATOR = " – ";

const stripTrailingParentheses = (name: string) => {
  let current = name.trim();
  let previous = "";
  while (current !== previous) {
    previous = current;
    const stripped = current.replace(TRAILING_PARENTHESES, "").trim();
    // Keep a name that is only parentheses.
    current = stripped || current;
  }
  return current;
};

const detail = (details: unknown, key: string) => {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const value = (details as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
};

/** What to search for, from the product's English name and details. */
export const coverQuery = (
  product: CoverProduct,
  strategy: CoverStrategy
): CoverQuery => {
  const name = stripTrailingParentheses(product.name_en);
  const [first = name, ...rest] = name.split(NAME_SEPARATOR);
  const second = rest.join(NAME_SEPARATOR) || undefined;

  if (strategy === "music") {
    const artist = detail(product.details, "Artist");
    return second
      ? { creator: artist ?? first, title: second }
      : { creator: artist, title: first };
  }
  if (strategy === "books") {
    return {
      creator: detail(product.details, "Author") ?? second,
      title: first,
    };
  }
  return { title: name };
};

export interface CoverCandidate {
  source: "coverartarchive" | "openlibrary" | "wikipedia";
  /** Artist, author, year or description, when known. */
  subtitle?: string;
  title: string;
  url: string;
}

export interface LookupOptions {
  fetch?: typeof fetch;
  /** Candidates to return at most (default 4). */
  limit?: number;
  signal?: AbortSignal;
  /** Waits for MusicBrainz' rate limit (default: one request per 1.1 s). */
  throttle?: () => Promise<void>;
}

export class LookupError extends Error {}

/**
 * A queue that spaces calls at least `intervalMs` apart, across every
 * caller (MusicBrainz allows one request per second per client).
 */
export const createThrottle = (
  intervalMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms))
) => {
  let nextAt = 0;
  let queue: Promise<void> = Promise.resolve();
  return () => {
    const turn = queue.then(async () => {
      const wait = nextAt - now();
      if (wait > 0) {
        await sleep(wait);
      }
      nextAt = now() + intervalMs;
    });
    queue = turn;
    return turn;
  };
};

const musicBrainzThrottle = createThrottle(1100);

const getJson = async (
  url: string,
  { fetch: fetcher = fetch, signal }: LookupOptions
): Promise<unknown> => {
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new LookupError(`${new URL(url).hostname}: ${response.status}`);
  }
  return response.json();
};

const joinDefined = (...parts: (string | number | undefined | null)[]) =>
  parts
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(" · ") || undefined;

// Lucene phrase for MusicBrainz' search syntax.
const LUCENE_SPECIAL = /[\\"]/g;
const phrase = (value: string) => `"${value.replace(LUCENE_SPECIAL, "\\$&")}"`;

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// MusicBrainz scores 0–100; weaker matches are rarely the same album.
const MIN_MUSICBRAINZ_SCORE = 60;

interface ReleaseGroup {
  "artist-credit"?: { name?: string }[];
  "first-release-date"?: string;
  id?: string;
  score?: number;
  title?: string;
}

/** Album covers: a MusicBrainz release-group search, then the Cover Art Archive. */
export const findMusicCovers = async (
  query: CoverQuery,
  options: LookupOptions = {}
): Promise<CoverCandidate[]> => {
  const limit = options.limit ?? 4;
  const terms = [`releasegroup:${phrase(query.title)}`];
  if (query.creator) {
    terms.push(`artist:${phrase(query.creator)}`);
  }
  await (options.throttle ?? musicBrainzThrottle)();
  const data = (await getJson(
    `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(
      terms.join(" AND ")
    )}&fmt=json&limit=${limit}`,
    options
  )) as { "release-groups"?: ReleaseGroup[] } | null;

  return (data?.["release-groups"] ?? [])
    .filter(
      (group): group is ReleaseGroup & { id: string } =>
        typeof group.id === "string" &&
        MBID.test(group.id) &&
        (group.score ?? 100) >= MIN_MUSICBRAINZ_SCORE
    )
    .slice(0, limit)
    .map((group) => ({
      source: "coverartarchive" as const,
      subtitle: joinDefined(
        (group["artist-credit"] ?? [])
          .map((credit) => credit.name)
          .filter(Boolean)
          .join(", "),
        group["first-release-date"]?.slice(0, 4)
      ),
      title: group.title ?? query.title,
      url: `https://coverartarchive.org/release-group/${group.id}/front-500`,
    }));
};

interface OpenLibraryDoc {
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  title?: string;
}

/** Book covers: an Open Library search, then its covers service. */
export const findBookCovers = async (
  query: CoverQuery,
  options: LookupOptions = {}
): Promise<CoverCandidate[]> => {
  const limit = options.limit ?? 4;
  const params = new URLSearchParams({
    fields: "key,title,author_name,cover_i,first_publish_year",
    limit: String(limit * 3),
    title: query.title,
  });
  if (query.creator) {
    params.set("author", query.creator);
  }
  const data = (await getJson(
    `https://openlibrary.org/search.json?${params.toString()}`,
    options
  )) as { docs?: OpenLibraryDoc[] } | null;

  return (data?.docs ?? [])
    .filter(
      (doc): doc is OpenLibraryDoc & { cover_i: number } =>
        Number.isInteger(doc.cover_i) && (doc.cover_i ?? 0) > 0
    )
    .slice(0, limit)
    .map((doc) => ({
      source: "openlibrary" as const,
      subtitle: joinDefined(doc.author_name?.[0], doc.first_publish_year),
      title: doc.title ?? query.title,
      url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    }));
};

interface WikipediaSummary {
  description?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
  title?: string;
  type?: string;
}

// next/image doesn't optimise SVG; their thumbnails are PNG.
const SVG = /\.svg$/i;

const summaryImage = (summary: WikipediaSummary) => {
  const original = summary.originalimage?.source;
  if (original && !SVG.test(original) && isRemoteCatalogImage(original)) {
    return original;
  }
  const thumbnail = summary.thumbnail?.source;
  return thumbnail && isRemoteCatalogImage(thumbnail) ? thumbnail : undefined;
};

const wikipediaSummary = async (title: string, options: LookupOptions) =>
  (await getJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title.replaceAll(" ", "_")
    )}?redirect=true`,
    options
  )) as WikipediaSummary | null;

const summaryCandidate = (
  summary: WikipediaSummary | null
): CoverCandidate | null => {
  if (!summary || summary.type === "disambiguation") {
    return null;
  }
  const url = summaryImage(summary);
  return url
    ? {
        source: "wikipedia",
        subtitle: summary.description,
        title: summary.title ?? "",
        url,
      }
    : null;
};

/**
 * Games, films and tech: the Wikipedia page summary's image (on
 * upload.wikimedia.org). Tries the exact title, then the top title-search
 * results.
 */
export const findWikipediaCovers = async (
  query: CoverQuery,
  options: LookupOptions = {}
): Promise<CoverCandidate[]> => {
  const limit = options.limit ?? 4;
  const candidates: CoverCandidate[] = [];
  const exact = summaryCandidate(await wikipediaSummary(query.title, options));
  if (exact) {
    candidates.push(exact);
  }

  const search = (await getJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(
      query.title
    )}&limit=${limit}`,
    options
  )) as { pages?: { key?: string }[] } | null;
  const keys = (search?.pages ?? [])
    .map((page) => page.key)
    .filter((key): key is string => typeof key === "string" && key !== "")
    .filter((key) => key.replaceAll("_", " ") !== exact?.title);

  for (const key of keys) {
    if (candidates.length >= limit) {
      break;
    }
    // biome-ignore lint/performance/noAwaitInLoops: a few polite, sequential requests
    const candidate = summaryCandidate(await wikipediaSummary(key, options));
    if (candidate && !candidates.some((item) => item.url === candidate.url)) {
      candidates.push(candidate);
    }
  }
  return candidates;
};

/** Cover candidates for a product, from the source its category calls for. */
export const findCovers = async (
  product: CoverProduct,
  categorySlug: string | null | undefined,
  options: LookupOptions = {}
): Promise<CoverCandidate[]> => {
  const strategy = coverStrategy(categorySlug);
  const query = coverQuery(product, strategy);
  if (!query.title) {
    return [];
  }
  const lookup = {
    books: findBookCovers,
    music: findMusicCovers,
    wikipedia: findWikipediaCovers,
  }[strategy];
  const seen = new Set<string>();
  return (await lookup(query, options)).filter((candidate) => {
    if (!isRemoteCatalogImage(candidate.url) || seen.has(candidate.url)) {
      return false;
    }
    seen.add(candidate.url);
    return true;
  });
};
