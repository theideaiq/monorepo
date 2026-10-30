import { describe, expect, it } from "vitest";
import {
  discogsUsername,
  fetchDiscogsWants,
  fetchSteamWishlist,
  ListImportError,
  steamId,
} from "../lib/lists";

const reply = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });

describe("discogsUsername", () => {
  it("takes a name or a profile link", () => {
    expect(discogsUsername("vinyl_fan")).toBe("vinyl_fan");
    expect(discogsUsername("https://www.discogs.com/user/vinyl_fan/")).toBe(
      "vinyl_fan"
    );
    expect(discogsUsername("not a name")).toBeNull();
  });
});

describe("fetchDiscogsWants", () => {
  it("reads every page and drops Discogs' artist numbers", async () => {
    const urls: string[] = [];
    const fetcher = ((url: string) => {
      urls.push(url);
      const page = Number(new URL(url).searchParams.get("page"));
      return Promise.resolve(
        reply({
          pagination: { pages: 2 },
          wants: [
            {
              basic_information: {
                artists: [{ name: "Nirvana (2)" }],
                title: page === 1 ? "Nevermind" : "In Utero",
                year: page === 1 ? 1991 : 0,
              },
              id: page,
            },
          ],
        })
      );
    }) as typeof fetch;

    const items = await fetchDiscogsWants("fan", { fetcher });
    expect(urls).toHaveLength(2);
    expect(items).toEqual([
      {
        creator: "Nirvana",
        external_ids: { discogs: "1" },
        kind: "record",
        source: "discogs",
        title: "Nevermind",
        year: 1991,
      },
      {
        creator: "Nirvana",
        external_ids: { discogs: "2" },
        kind: "record",
        source: "discogs",
        title: "In Utero",
        year: undefined,
      },
    ]);
  });

  it("says when the user doesn't exist", async () => {
    const fetcher = (async () => reply({}, 404)) as unknown as typeof fetch;
    await expect(fetchDiscogsWants("nobody", { fetcher })).rejects.toEqual(
      new ListImportError("not_found")
    );
  });
});

describe("steamId", () => {
  it("takes an ID, a profile link or a custom URL", async () => {
    const fetcher = (async () =>
      reply(
        "<profile><steamID64>76561197960287930</steamID64></profile>"
      )) as unknown as typeof fetch;
    expect(await steamId("76561197960287930", fetcher)).toBe(
      "76561197960287930"
    );
    expect(
      await steamId(
        "https://steamcommunity.com/profiles/76561197960287930/",
        fetcher
      )
    ).toBe("76561197960287930");
    expect(await steamId("https://steamcommunity.com/id/gaben", fetcher)).toBe(
      "76561197960287930"
    );
    expect(await steamId("no spaces allowed", fetcher)).toBeNull();
  });
});

describe("fetchSteamWishlist", () => {
  it("names each game on the wishlist", async () => {
    const fetcher = (async (url: string) =>
      url.includes("GetWishlist")
        ? reply({ response: { items: [{ appid: 620 }] } })
        : reply({
            response: {
              store_items: [
                {
                  appid: 620,
                  name: "Portal 2",
                  release: { steam_release_date: 1_303_171_200 },
                },
              ],
            },
          })) as unknown as typeof fetch;
    expect(await fetchSteamWishlist("76561197960287930", fetcher)).toEqual([
      {
        external_ids: { steam: "620" },
        kind: "game",
        source: "steam",
        title: "Portal 2",
        year: 2011,
      },
    ]);
  });

  it("treats an empty answer as a private wishlist", async () => {
    const fetcher = (async () =>
      reply({ response: {} })) as unknown as typeof fetch;
    await expect(
      fetchSteamWishlist("76561197960287930", fetcher)
    ).rejects.toEqual(new ListImportError("private"));
  });
});
