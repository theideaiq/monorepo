/**
 * Product data sources, each turned into the same candidate shape. Every
 * call takes `fetch` so tests can answer for the source.
 */

export type LookupSource =
  | "openlibrary"
  | "googlebooks"
  | "musicbrainz"
  | "discogs"
  | "igdb"
  | "tmdb"
  | "bgg"
  | "scryfall"
  | "pokemontcg";

export interface LookupCandidate {
  barcode?: string;
  creator?: string;
  /** Facts for the product's details (Artist, Author, Platform…). */
  details: Record<string, string>;
  /** The source's own ID, saved in products.external_ids. */
  id: string;
  image?: string;
  source: LookupSource;
  title: string;
  url: string;
  year?: number;
}

export interface LookupQuery {
  /** A GTIN (EAN-13, UPC-A, ISBN-13), digits only. */
  barcode?: string;
  /** Artist or author, when known. */
  creator?: string;
  text?: string;
}

export interface SourceKeys {
  bggToken?: string;
  discogsToken?: string;
  googleBooksKey?: string;
  igdb?: { clientId: string; clientSecret: string };
  pokemonKey?: string;
  tmdbToken?: string;
}

type Fetch = typeof fetch;

const USER_AGENT = "TheIDEA/1.0 (+https://theideaiq.com)";
const LIMIT = 5;
const YEAR = /\b(\d{4})\b/;

const yearOf = (value: unknown) => {
  const match = YEAR.exec(String(value ?? ""));
  return match ? Number(match[1]) : undefined;
};

const getJson = async (fetcher: Fetch, url: string, init?: RequestInit) => {
  const response = await fetcher(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`${new URL(url).host} answered ${response.status}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
};

const list = (value: unknown) => (Array.isArray(value) ? value : []);
const str = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const compact = (record: Record<string, string | undefined>) =>
  Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] =>
      Boolean(entry[1])
    )
  );

// ── Books ─────────────────────────────────────────────────────────────────

export const openLibrary = async (query: LookupQuery, fetcher: Fetch) => {
  const params = new URLSearchParams({
    fields: "key,title,author_name,first_publish_year,isbn,cover_i",
    limit: String(LIMIT),
  });
  if (query.barcode) {
    params.set("isbn", query.barcode);
  } else {
    params.set("title", query.text ?? "");
    if (query.creator) {
      params.set("author", query.creator);
    }
  }
  const body = await getJson(
    fetcher,
    `https://openlibrary.org/search.json?${params}`
  );
  return list(body.docs).map((doc): LookupCandidate => {
    const author = str(list(doc.author_name)[0]);
    const isbn = list(doc.isbn).find(
      (value) => typeof value === "string" && value.length === 13
    ) as string | undefined;
    return {
      barcode: query.barcode ?? isbn,
      creator: author,
      details: compact({ Author: author }),
      id: String(doc.key ?? "").replace("/works/", ""),
      image: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      source: "openlibrary",
      title: str(doc.title) ?? "",
      url: `https://openlibrary.org${doc.key}`,
      year: yearOf(doc.first_publish_year),
    };
  });
};

export const googleBooks = async (
  query: LookupQuery,
  fetcher: Fetch,
  key?: string
) => {
  const q = query.barcode
    ? `isbn:${query.barcode}`
    : [
        `intitle:${query.text ?? ""}`,
        query.creator ? `inauthor:${query.creator}` : "",
      ]
        .filter(Boolean)
        .join("+");
  const params = new URLSearchParams({ maxResults: String(LIMIT), q });
  if (key) {
    params.set("key", key);
  }
  const body = await getJson(
    fetcher,
    `https://www.googleapis.com/books/v1/volumes?${params}`
  );
  return list(body.items).map((item): LookupCandidate => {
    const info = (item.volumeInfo ?? {}) as Record<string, unknown>;
    const author = str(list(info.authors)[0]);
    const isbn = list(info.industryIdentifiers).find(
      (entry) => (entry as { type?: string }).type === "ISBN_13"
    ) as { identifier?: string } | undefined;
    const thumbnail = str(
      (info.imageLinks as Record<string, unknown> | undefined)?.thumbnail
    );
    return {
      barcode: isbn?.identifier,
      creator: author,
      details: compact({
        Author: author,
        Language: str(info.language)?.toUpperCase(),
        Pages: info.pageCount ? String(info.pageCount) : undefined,
        Publisher: str(info.publisher),
      }),
      id: String(item.id ?? ""),
      image: thumbnail?.replace("http://", "https://"),
      source: "googlebooks",
      title: str(info.title) ?? "",
      url: str(info.infoLink) ?? `https://books.google.com/books?id=${item.id}`,
      year: yearOf(info.publishedDate),
    };
  });
};

// ── Music ─────────────────────────────────────────────────────────────────

export const musicBrainz = async (query: LookupQuery, fetcher: Fetch) => {
  const lucene = query.barcode
    ? `barcode:${query.barcode}`
    : [
        `release:"${(query.text ?? "").replaceAll('"', "")}"`,
        query.creator ? `artist:"${query.creator.replaceAll('"', "")}"` : "",
      ]
        .filter(Boolean)
        .join(" AND ");
  const params = new URLSearchParams({
    fmt: "json",
    limit: String(LIMIT),
    query: lucene,
  });
  const body = await getJson(
    fetcher,
    `https://musicbrainz.org/ws/2/release?${params}`
  );
  return list(body.releases).map((release): LookupCandidate => {
    const artist = str(
      (list(release["artist-credit"])[0] as { name?: string } | undefined)?.name
    );
    const format = str(
      (list(release.media)[0] as { format?: string } | undefined)?.format
    );
    return {
      barcode: str(release.barcode),
      creator: artist,
      details: compact({ Artist: artist, Format: format }),
      id: String(release.id ?? ""),
      image: `https://coverartarchive.org/release/${release.id}/front-500`,
      source: "musicbrainz",
      title: str(release.title) ?? "",
      url: `https://musicbrainz.org/release/${release.id}`,
      year: yearOf(release.date),
    };
  });
};

export const discogs = async (
  query: LookupQuery,
  fetcher: Fetch,
  token: string
) => {
  const params = new URLSearchParams({
    per_page: String(LIMIT),
    type: "release",
  });
  if (query.barcode) {
    params.set("barcode", query.barcode);
  } else {
    params.set("release_title", query.text ?? "");
    if (query.creator) {
      params.set("artist", query.creator);
    }
  }
  const body = await getJson(
    fetcher,
    `https://api.discogs.com/database/search?${params}`,
    { headers: { Authorization: `Discogs token=${token}` } }
  );
  return list(body.results).map((result): LookupCandidate => {
    // Discogs titles read "Artist - Title".
    const [artist, ...rest] = String(result.title ?? "").split(" - ");
    const title = rest.join(" - ") || artist;
    const format = str(list(result.format)[0]);
    return {
      barcode: list(result.barcode)
        .map((value) => String(value).replace(/\D/g, ""))
        .find((value) => value.length >= 12),
      creator: rest.length > 0 ? artist : undefined,
      details: compact({
        Artist: rest.length > 0 ? artist : undefined,
        Format: format,
        Label: str(list(result.label)[0]),
      }),
      id: String(result.id ?? ""),
      image: str(result.cover_image),
      source: "discogs",
      title: title ?? "",
      url: `https://www.discogs.com${result.uri ?? ""}`,
      year: yearOf(result.year),
    };
  });
};

// ── Games ─────────────────────────────────────────────────────────────────

let igdbToken: { expires: number; value: string } | null = null;

const igdbAccess = async (
  fetcher: Fetch,
  { clientId, clientSecret }: { clientId: string; clientSecret: string }
) => {
  if (igdbToken && igdbToken.expires > Date.now() + 60_000) {
    return igdbToken.value;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const body = await getJson(
    fetcher,
    `https://id.twitch.tv/oauth2/token?${params}`,
    { method: "POST" }
  );
  igdbToken = {
    expires: Date.now() + Number(body.expires_in ?? 0) * 1000,
    value: String(body.access_token ?? ""),
  };
  return igdbToken.value;
};

export const igdb = async (
  query: LookupQuery,
  fetcher: Fetch,
  credentials: { clientId: string; clientSecret: string }
) => {
  const token = await igdbAccess(fetcher, credentials);
  const response = await fetcher("https://api.igdb.com/v4/games", {
    body: `search "${(query.text ?? "").replaceAll('"', "")}"; fields name,first_release_date,cover.image_id,platforms.abbreviation,involved_companies.company.name,url; limit ${LIMIT};`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": credentials.clientId,
      "User-Agent": USER_AGENT,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`api.igdb.com answered ${response.status}`);
  }
  const games = (await response.json()) as Record<string, unknown>[];
  return games.map((game): LookupCandidate => {
    const cover = game.cover as { image_id?: string } | undefined;
    const studio = str(
      (
        list(game.involved_companies)[0] as
          | { company?: { name?: string } }
          | undefined
      )?.company?.name
    );
    const platforms = list(game.platforms)
      .map((platform) =>
        str((platform as { abbreviation?: string }).abbreviation)
      )
      .filter(Boolean)
      .join(", ");
    return {
      creator: studio,
      details: compact({ Platforms: platforms || undefined, Studio: studio }),
      id: String(game.id ?? ""),
      image: cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`
        : undefined,
      source: "igdb",
      title: str(game.name) ?? "",
      url: str(game.url) ?? "https://www.igdb.com",
      year: game.first_release_date
        ? new Date(Number(game.first_release_date) * 1000).getUTCFullYear()
        : undefined,
    };
  });
};

// ── Films ─────────────────────────────────────────────────────────────────

export const tmdb = async (
  query: LookupQuery,
  fetcher: Fetch,
  token: string
) => {
  const params = new URLSearchParams({
    include_adult: "false",
    query: query.text ?? "",
  });
  const body = await getJson(
    fetcher,
    `https://api.themoviedb.org/3/search/movie?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return list(body.results)
    .slice(0, LIMIT)
    .map(
      (movie): LookupCandidate => ({
        details: compact({
          "Original title":
            movie.original_title === movie.title
              ? undefined
              : str(movie.original_title),
        }),
        id: `movie/${movie.id}`,
        image: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : undefined,
        source: "tmdb",
        title: str(movie.title) ?? "",
        url: `https://www.themoviedb.org/movie/${movie.id}`,
        year: yearOf(movie.release_date),
      })
    );
};

// ── Board games ───────────────────────────────────────────────────────────

const XML_ITEM = /<item[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;
const XML_NAME = /<name[^>]*\bvalue="([^"]*)"/;
const XML_YEAR = /<yearpublished[^>]*\bvalue="(\d{4})"/;

const unescapeXml = (value: string) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

export const boardGameGeek = async (
  query: LookupQuery,
  fetcher: Fetch,
  token: string
) => {
  const params = new URLSearchParams({
    query: query.text ?? "",
    type: "boardgame",
  });
  const response = await fetcher(
    `https://boardgamegeek.com/xmlapi2/search?${params}`,
    {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
    }
  );
  if (!response.ok) {
    throw new Error(`boardgamegeek.com answered ${response.status}`);
  }
  const xml = await response.text();
  return [...xml.matchAll(XML_ITEM)].slice(0, LIMIT).map(
    ([, id, inner]): LookupCandidate => ({
      details: {},
      id: id ?? "",
      source: "bgg",
      title: unescapeXml(XML_NAME.exec(inner ?? "")?.[1] ?? ""),
      url: `https://boardgamegeek.com/boardgame/${id}`,
      year: yearOf(XML_YEAR.exec(inner ?? "")?.[1]),
    })
  );
};

// ── Trading cards ─────────────────────────────────────────────────────────

export const scryfall = async (query: LookupQuery, fetcher: Fetch) => {
  const params = new URLSearchParams({ q: query.text ?? "", unique: "prints" });
  const response = await fetcher(
    `https://api.scryfall.com/cards/search?${params}`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }
  );
  // Scryfall answers 404 when nothing matches.
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`api.scryfall.com answered ${response.status}`);
  }
  const body = (await response.json()) as Record<string, unknown>;
  return list(body.data)
    .slice(0, LIMIT)
    .map((card): LookupCandidate => {
      const images = card.image_uris as Record<string, string> | undefined;
      return {
        details: compact({
          Game: "Magic: The Gathering",
          Rarity: str(card.rarity),
          Set: str(card.set_name),
        }),
        id: String(card.id ?? ""),
        image: images?.normal,
        source: "scryfall",
        title: str(card.name) ?? "",
        url: str(card.scryfall_uri) ?? "https://scryfall.com",
        year: yearOf(card.released_at),
      };
    });
};

export const pokemonTcg = async (
  query: LookupQuery,
  fetcher: Fetch,
  key?: string
) => {
  const params = new URLSearchParams({
    pageSize: String(LIMIT),
    q: `name:"${(query.text ?? "").replaceAll('"', "")}"`,
  });
  const body = await getJson(
    fetcher,
    `https://api.pokemontcg.io/v2/cards?${params}`,
    key ? { headers: { "X-Api-Key": key } } : undefined
  );
  return list(body.data).map((card): LookupCandidate => {
    const set = card.set as { name?: string; releaseDate?: string } | undefined;
    return {
      details: compact({
        Game: "Pokémon",
        Rarity: str(card.rarity),
        Set: str(set?.name),
      }),
      id: String(card.id ?? ""),
      image: str((card.images as Record<string, string> | undefined)?.large),
      source: "pokemontcg",
      title: str(card.name) ?? "",
      url: `https://pokemontcg.io/card/${card.id}`,
      year: yearOf(set?.releaseDate),
    };
  });
};
