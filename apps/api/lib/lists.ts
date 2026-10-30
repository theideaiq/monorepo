/**
 * "Import your list" for the lists that live behind an account rather than
 * in a file: a Discogs wantlist (public, by username) and a Steam wishlist
 * (public, by profile). The website parses Goodreads, StoryGraph and
 * Letterboxd exports itself; all of them end in `import_list_items`.
 */

export interface ImportItem {
  creator?: string;
  external_ids: Record<string, string>;
  kind: "book" | "film" | "game" | "record";
  source: "discogs" | "goodreads" | "letterboxd" | "steam" | "storygraph";
  title: string;
  year?: number;
}

/** The most a list import reads (`import_list_items` takes 2,000). */
export const MAX_IMPORT = 2000;

const USER_AGENT = "TheIDEA/1.0 (+https://theideaiq.com)";
const DISCOGS_PAGE = 100;
const STEAM_BATCH = 100;
const DISCOGS_USERNAME = /^[\w.-]{1,64}$/;
const STEAM_ID = /^\d{17}$/;
const STEAM_PROFILE = /steamcommunity\.com\/profiles\/(\d{17})/;
const STEAM_VANITY =
  /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/id\/([\w-]{2,32})/;
const STEAM_NAME = /^[\w-]{2,32}$/;
const STEAM_ID_XML = /<steamID64>(\d{17})<\/steamID64>/;
const DISCOGS_SUFFIX = / \(\d+\)$/;
const TRAILING_SLASHES = /\/+$/;

export class ListImportError extends Error {
  readonly code: "not_found" | "private" | "unavailable";
  constructor(code: ListImportError["code"]) {
    super(code);
    this.code = code;
  }
}

type Fetcher = typeof fetch;

const getJson = async (
  fetcher: Fetcher,
  url: string,
  headers: Record<string, string> = {}
): Promise<Record<string, unknown>> => {
  const response = await fetcher(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) {
    throw new ListImportError("not_found");
  }
  if (response.status === 401 || response.status === 403) {
    throw new ListImportError("private");
  }
  if (!response.ok) {
    throw new ListImportError("unavailable");
  }
  return (await response.json()) as Record<string, unknown>;
};

const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
    : [];

const yearOf = (value: unknown) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= 3000
    ? year
    : undefined;
};

// ── Discogs ────────────────────────────────────────────────────────────────

/** A Discogs username from what the member typed (a name or a profile link). */
export const discogsUsername = (input: string) => {
  const trimmed = input.trim().replace(TRAILING_SLASHES, "");
  const name = trimmed.split("/").at(-1) ?? "";
  return DISCOGS_USERNAME.test(name) ? name : null;
};

/** A Discogs wantlist: each release, with its artist and year. */
export const fetchDiscogsWants = async (
  username: string,
  { fetcher = fetch, token }: { fetcher?: Fetcher; token?: string } = {}
): Promise<ImportItem[]> => {
  const items: ImportItem[] = [];
  const auth: Record<string, string> = token
    ? { Authorization: `Discogs token=${token}` }
    : {};
  for (let page = 1; items.length < MAX_IMPORT; page += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
    const body = await getJson(
      fetcher,
      `https://api.discogs.com/users/${encodeURIComponent(username)}/wants?per_page=${DISCOGS_PAGE}&page=${page}`,
      auth
    );
    for (const want of records(body.wants)) {
      const info = (want.basic_information ?? {}) as Record<string, unknown>;
      const title = String(info.title ?? "").trim();
      if (!title) {
        continue;
      }
      // Discogs numbers artists who share a name: "Nirvana (2)".
      const artist = String(records(info.artists)[0]?.name ?? "")
        .replace(DISCOGS_SUFFIX, "")
        .trim();
      items.push({
        creator: artist || undefined,
        external_ids: { discogs: String(want.id ?? info.id ?? "") },
        kind: "record",
        source: "discogs",
        title,
        year: yearOf(info.year),
      });
    }
    const pages = Number(
      (body.pagination as Record<string, unknown> | undefined)?.pages ?? 1
    );
    if (page >= pages) {
      break;
    }
  }
  return items.slice(0, MAX_IMPORT);
};

// ── Steam ──────────────────────────────────────────────────────────────────

/** The SteamID64 behind a profile link, a custom URL name or the ID itself. */
export const steamId = async (
  input: string,
  fetcher: Fetcher = fetch
): Promise<string | null> => {
  const trimmed = input.trim();
  if (STEAM_ID.test(trimmed)) {
    return trimmed;
  }
  const profile = STEAM_PROFILE.exec(trimmed);
  if (profile?.[1]) {
    return profile[1];
  }
  const name = STEAM_VANITY.exec(trimmed)?.[1] ?? trimmed;
  if (!STEAM_NAME.test(name)) {
    return null;
  }
  const response = await fetcher(
    `https://steamcommunity.com/id/${encodeURIComponent(name)}/?xml=1`,
    {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!response.ok) {
    throw new ListImportError("unavailable");
  }
  return STEAM_ID_XML.exec(await response.text())?.[1] ?? null;
};

/** A public Steam wishlist: each game's name and Steam app ID. */
export const fetchSteamWishlist = async (
  id: string,
  fetcher: Fetcher = fetch
): Promise<ImportItem[]> => {
  const body = await getJson(
    fetcher,
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${id}`
  );
  const response = (body.response ?? {}) as Record<string, unknown>;
  if (!("items" in response)) {
    // An empty response is how Steam answers for a private wishlist.
    throw new ListImportError("private");
  }
  const appIds = records(response.items)
    .map((item) => Number(item.appid))
    .filter((appId) => Number.isInteger(appId) && appId > 0)
    .slice(0, MAX_IMPORT);

  const items: ImportItem[] = [];
  for (let start = 0; start < appIds.length; start += STEAM_BATCH) {
    const input = {
      context: { country_code: "IQ", language: "english" },
      data_request: { include_release: true },
      ids: appIds.slice(start, start + STEAM_BATCH).map((appid) => ({ appid })),
    };
    // biome-ignore lint/performance/noAwaitInLoops: one batch at a time keeps within Steam's rate limit
    const details = await getJson(
      fetcher,
      `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`
    );
    for (const item of records(
      (details.response as Record<string, unknown> | undefined)?.store_items
    )) {
      const title = String(item.name ?? "").trim();
      if (!title) {
        continue;
      }
      const release = (item.release ?? {}) as Record<string, unknown>;
      const released = Number(release.steam_release_date);
      items.push({
        external_ids: { steam: String(item.appid ?? item.id ?? "") },
        kind: "game",
        source: "steam",
        title,
        year: released ? new Date(released * 1000).getUTCFullYear() : undefined,
      });
    }
  }
  return items;
};
