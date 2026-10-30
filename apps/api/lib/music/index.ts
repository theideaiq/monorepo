import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Vinyl from artists you listen to" (Pass → Saved): the artists a member
 * listens to, from Last.fm (a public username) or Spotify (they sign in;
 * the refresh token keeps them up to date). `save_music_taste` stores them
 * folded; `vinyl_from_my_artists` matches the Store's vinyl.
 */

type Fetcher = typeof fetch;

const USER_AGENT = "TheIDEA/1.0 (+https://theideaiq.com)";
const LASTFM_USERNAME = /^[A-Za-z][\w-]{1,14}$/;
const SPOTIFY_SCOPES = "user-top-read user-follow-read";
const ARTISTS_MAX = 200;

export class MusicError extends Error {
  readonly code: "not_found" | "revoked" | "unavailable";
  constructor(code: MusicError["code"]) {
    super(code);
    this.code = code;
  }
}

const getJson = async (
  fetcher: Fetcher,
  url: string,
  init: RequestInit = {}
): Promise<Record<string, unknown>> => {
  const response = await fetcher(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) {
    throw new MusicError("not_found");
  }
  if (response.status === 400 || response.status === 401) {
    throw new MusicError("revoked");
  }
  if (!response.ok) {
    throw new MusicError("unavailable");
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

const names = (items: Record<string, unknown>[]) =>
  items.map((item) => String(item.name ?? "").trim()).filter(Boolean);

/** The artists in order, each once, at most 200. */
export const uniqueArtists = (artists: readonly string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const artist of artists) {
    const key = artist.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(artist);
    }
  }
  return result.slice(0, ARTISTS_MAX);
};

// ── Last.fm ────────────────────────────────────────────────────────────────

export const isLastfmUsername = (value: string) => LASTFM_USERNAME.test(value);

/** A Last.fm user's most played artists (all time, then the last year). */
export const lastfmArtists = async (
  username: string,
  apiKey: string,
  fetcher: Fetcher = fetch
) => {
  const top = (period: string) =>
    getJson(
      fetcher,
      `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({
        api_key: apiKey,
        format: "json",
        limit: "100",
        method: "user.gettopartists",
        period,
        user: username,
      })}`
    ).then((body) => {
      if (body.error === 6) {
        throw new MusicError("not_found");
      }
      return names(
        records(
          (body.topartists as Record<string, unknown> | undefined)?.artist
        )
      );
    });
  const [overall, year] = await Promise.all([top("overall"), top("12month")]);
  return uniqueArtists([...year, ...overall]);
};

// ── Spotify ────────────────────────────────────────────────────────────────

export interface SpotifyApp {
  clientId: string;
  clientSecret: string;
}

export const spotifyAuthorizeUrl = (
  app: SpotifyApp,
  redirectUri: string,
  state: string
) =>
  `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SPOTIFY_SCOPES,
    state,
  })}`;

const spotifyToken = async (
  app: SpotifyApp,
  body: Record<string, string>,
  fetcher: Fetcher
) => {
  const token = await getJson(
    fetcher,
    "https://accounts.spotify.com/api/token",
    {
      body: new URLSearchParams(body),
      headers: {
        Authorization: `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );
  const accessToken = String(token.access_token ?? "");
  if (!accessToken) {
    throw new MusicError("revoked");
  }
  return {
    accessToken,
    refreshToken:
      typeof token.refresh_token === "string" ? token.refresh_token : null,
  };
};

/** Trades the sign-in's code for tokens. */
export const spotifyExchange = (
  app: SpotifyApp,
  code: string,
  redirectUri: string,
  fetcher: Fetcher = fetch
) =>
  spotifyToken(
    app,
    { code, grant_type: "authorization_code", redirect_uri: redirectUri },
    fetcher
  );

/** A new access token (and sometimes a new refresh token). */
export const spotifyRefresh = (
  app: SpotifyApp,
  refreshToken: string,
  fetcher: Fetcher = fetch
) =>
  spotifyToken(
    app,
    { grant_type: "refresh_token", refresh_token: refreshToken },
    fetcher
  );

/**
 * The member's Spotify name and artists: their top artists over about six
 * months, then all time, then the artists they follow.
 */
export const spotifyArtists = async (
  accessToken: string,
  fetcher: Fetcher = fetch
) => {
  const get = (path: string) =>
    getJson(fetcher, `https://api.spotify.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  const [me, medium, long, followed] = await Promise.all([
    get("me"),
    get("me/top/artists?limit=50&time_range=medium_term"),
    get("me/top/artists?limit=50&time_range=long_term"),
    get("me/following?type=artist&limit=50"),
  ]);
  return {
    account: String(me.display_name || me.id || "Spotify").slice(0, 100),
    artists: uniqueArtists([
      ...names(records(medium.items)),
      ...names(records(long.items)),
      ...names(
        records(
          (followed.artists as Record<string, unknown> | undefined)?.items
        )
      ),
    ]),
  };
};

// ── Refresh ────────────────────────────────────────────────────────────────

interface RefreshDeps {
  admin: SupabaseClient<Database>;
  fetcher?: Fetcher;
  lastfmKey?: string;
  logger: { error: (message: string) => void };
  spotify?: SpotifyApp;
}

/** A connection's artists now, or null while its service isn't set up. */
const readTaste = async (
  row: { account: string; provider: string; refresh_token: string | null },
  {
    fetcher,
    lastfmKey,
    spotify,
  }: Pick<RefreshDeps, "lastfmKey" | "spotify"> & { fetcher: Fetcher }
): Promise<{
  account: string;
  artists: string[];
  refreshToken: string | null;
} | null> => {
  if (row.provider === "lastfm") {
    return lastfmKey
      ? {
          account: row.account,
          artists: await lastfmArtists(row.account, lastfmKey, fetcher),
          refreshToken: null,
        }
      : null;
  }
  if (!(spotify && row.refresh_token)) {
    return null;
  }
  const tokens = await spotifyRefresh(spotify, row.refresh_token, fetcher);
  return {
    ...(await spotifyArtists(tokens.accessToken, fetcher)),
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Brings connections older than 7 days up to date (`music_tastes_to_refresh`).
 * A Spotify connection the member revoked is removed.
 */
export const refreshMusicTastes = async ({
  admin,
  fetcher = fetch,
  lastfmKey,
  logger,
  spotify,
}: RefreshDeps) => {
  const { data: due, error } = await admin.rpc("music_tastes_to_refresh", {
    batch: 50,
  });
  if (error) {
    throw new Error(error.message);
  }
  let refreshed = 0;
  let removed = 0;
  for (const row of due ?? []) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: one member at a time keeps within the rate limits
      const taste = await readTaste(row, { fetcher, lastfmKey, spotify });
      if (!taste) {
        continue;
      }
      const saved = await admin.rpc("save_music_taste", {
        account: taste.account,
        artists: taste.artists,
        member: row.user_id,
        provider: row.provider,
        refresh_token: taste.refreshToken ?? undefined,
      });
      if (saved.error) {
        throw new Error(saved.error.message);
      }
      refreshed += 1;
    } catch (failure) {
      if (failure instanceof MusicError && failure.code !== "unavailable") {
        await admin.from("music_tastes").delete().eq("user_id", row.user_id);
        removed += 1;
        continue;
      }
      logger.error(
        `Music refresh for ${row.user_id} failed: ${failure instanceof Error ? failure.message : String(failure)}`
      );
    }
  }
  return { refreshed, removed };
};
