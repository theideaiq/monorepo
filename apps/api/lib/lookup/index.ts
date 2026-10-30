import {
  boardGameGeek,
  discogs,
  googleBooks,
  igdb,
  type LookupCandidate,
  type LookupQuery,
  type LookupSource,
  musicBrainz,
  openLibrary,
  pokemonTcg,
  type SourceKeys,
  scryfall,
  tmdb,
} from "./sources";

export type { LookupCandidate, LookupQuery, LookupSource } from "./sources";

/** The catalog's top-level categories that lookups know. */
export const LOOKUP_FAMILIES = [
  "books",
  "music",
  "games",
  "films",
  "board-games",
  "trading-cards",
] as const;

export type LookupFamily = (typeof LOOKUP_FAMILIES)[number];

type Runner = (
  query: LookupQuery,
  fetcher: typeof fetch
) => Promise<LookupCandidate[]>;

/** The sources for a family that can run with the keys set. */
export const sourcesFor = (
  family: LookupFamily,
  keys: SourceKeys
): [LookupSource, Runner][] => {
  const all: Record<LookupFamily, [LookupSource, Runner | null][]> = {
    "board-games": [
      [
        "bgg",
        keys.bggToken
          ? (query, fetcher) =>
              boardGameGeek(query, fetcher, keys.bggToken as string)
          : null,
      ],
    ],
    books: [
      ["openlibrary", openLibrary],
      [
        "googlebooks",
        (query, fetcher) => googleBooks(query, fetcher, keys.googleBooksKey),
      ],
    ],
    films: [
      [
        "tmdb",
        keys.tmdbToken
          ? (query, fetcher) => tmdb(query, fetcher, keys.tmdbToken as string)
          : null,
      ],
    ],
    games: [
      [
        "igdb",
        keys.igdb
          ? (query, fetcher) =>
              igdb(
                query,
                fetcher,
                keys.igdb as { clientId: string; clientSecret: string }
              )
          : null,
      ],
    ],
    music: [
      ["musicbrainz", musicBrainz],
      [
        "discogs",
        keys.discogsToken
          ? (query, fetcher) =>
              discogs(query, fetcher, keys.discogsToken as string)
          : null,
      ],
    ],
    "trading-cards": [
      ["scryfall", scryfall],
      [
        "pokemontcg",
        (query, fetcher) => pokemonTcg(query, fetcher, keys.pokemonKey),
      ],
    ],
  };
  return all[family].filter((entry): entry is [LookupSource, Runner] =>
    Boolean(entry[1])
  );
};

/**
 * Looks a product up in every source its family has, at once: what each
 * found (a failing source only adds its name to `failed`).
 */
export const lookupProduct = async (
  family: LookupFamily,
  query: LookupQuery,
  keys: SourceKeys,
  fetcher: typeof fetch = fetch
) => {
  const sources = sourcesFor(family, keys);
  const results = await Promise.allSettled(
    sources.map(([, run]) => run(query, fetcher))
  );
  const candidates: LookupCandidate[] = [];
  const failed: LookupSource[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      candidates.push(...result.value.filter((item) => item.title));
    } else {
      failed.push(sources[index]?.[0] as LookupSource);
    }
  });
  return { candidates, failed, sources: sources.map(([name]) => name) };
};
