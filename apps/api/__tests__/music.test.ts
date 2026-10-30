// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import {
  lastfmArtists,
  MusicError,
  refreshMusicTastes,
  spotifyArtists,
  uniqueArtists,
} from "../lib/music";
import { openState, safeReturnTo, sealState } from "../lib/music/state";

const route = (answers: Record<string, unknown>) =>
  vi.fn((url: string) => {
    const key = Object.keys(answers).find((part) => url.includes(part));
    return Promise.resolve(
      key
        ? Response.json(answers[key])
        : new Response("not found", { status: 404 })
    );
  }) as unknown as typeof fetch;

const app = {
  clientId: "client-id-123456",
  clientSecret: "client-secret-123456",
};

describe("uniqueArtists", () => {
  test("keeps the first of each, ignoring case", () => {
    expect(uniqueArtists(["Fairuz", "fairuz", "Kadim Al Sahir"])).toEqual([
      "Fairuz",
      "Kadim Al Sahir",
    ]);
  });
});

describe("lastfmArtists", () => {
  test("the last year first, then all time", async () => {
    const fetcher = route({
      "period=12month": { topartists: { artist: [{ name: "Radiohead" }] } },
      "period=overall": {
        topartists: { artist: [{ name: "Fairuz" }, { name: "Radiohead" }] },
      },
    });
    expect(await lastfmArtists("listener", "key", fetcher)).toEqual([
      "Radiohead",
      "Fairuz",
    ]);
  });

  test("an unknown user", async () => {
    const fetcher = route({ "ws.audioscrobbler.com": { error: 6 } });
    await expect(lastfmArtists("nobody", "key", fetcher)).rejects.toEqual(
      new MusicError("not_found")
    );
  });
});

describe("spotifyArtists", () => {
  test("top artists, then followed, with the display name", async () => {
    const fetcher = route({
      "following?type=artist": { artists: { items: [{ name: "Björk" }] } },
      "time_range=long_term": { items: [{ name: "Fairuz" }] },
      "time_range=medium_term": { items: [{ name: "Radiohead" }] },
      "v1/me": { display_name: "Sara" },
    });
    expect(await spotifyArtists("token", fetcher)).toEqual({
      account: "Sara",
      artists: ["Radiohead", "Fairuz", "Björk"],
    });
  });
});

describe("refreshMusicTastes", () => {
  test("updates Last.fm and removes a revoked Spotify connection", async () => {
    const remove = vi.fn(() => Promise.resolve({ error: null }));
    const rpc = vi.fn((name: string) =>
      Promise.resolve(
        name === "music_tastes_to_refresh"
          ? {
              data: [
                {
                  account: "listener",
                  provider: "lastfm",
                  refresh_token: null,
                  user_id: "u1",
                },
                {
                  account: "Sara",
                  provider: "spotify",
                  refresh_token: "old",
                  user_id: "u2",
                },
              ],
              error: null,
            }
          : { data: null, error: null }
      )
    );
    const admin = {
      from: () => ({ delete: () => ({ eq: remove }) }),
      rpc,
    } as never;
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        url.includes("accounts.spotify.com")
          ? Response.json({ error: "invalid_grant" }, { status: 400 })
          : Response.json({ topartists: { artist: [{ name: "Fairuz" }] } })
      )
    ) as unknown as typeof fetch;

    const result = await refreshMusicTastes({
      admin,
      fetcher,
      lastfmKey: "key",
      logger: { error: vi.fn() },
      spotify: app,
    });
    expect(result).toEqual({ refreshed: 1, removed: 1 });
    expect(rpc).toHaveBeenCalledWith("save_music_taste", {
      account: "listener",
      artists: ["Fairuz"],
      member: "u1",
      provider: "lastfm",
      refresh_token: undefined,
    });
    expect(remove).toHaveBeenCalledWith("user_id", "u2");
  });
});

describe("Spotify state", () => {
  test("round-trips, and only opens with the same app", async () => {
    const state = {
      returnTo: "/ar/pass/saved",
      userId: "6f1c3c1e-8a59-4a5f-9a43-2b1f5f0c8d11",
    };
    const sealed = await sealState(app, state);
    expect(await openState(app, sealed)).toEqual(state);
    expect(
      await openState({ ...app, clientSecret: "another-secret-123" }, sealed)
    ).toBeNull();
  });

  test("returns only to a path on the website", () => {
    expect(safeReturnTo("/en/pass/saved")).toBe("/en/pass/saved");
    expect(safeReturnTo("//evil.example")).toBe("/pass/saved");
    expect(safeReturnTo("https://evil.example")).toBe("/pass/saved");
    expect(safeReturnTo(undefined)).toBe("/pass/saved");
  });
});
