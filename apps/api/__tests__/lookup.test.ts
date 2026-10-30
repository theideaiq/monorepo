import { describe, expect, test, vi } from "vitest";
import { lookupProduct, sourcesFor } from "../lib/lookup";
import {
  boardGameGeek,
  discogs,
  musicBrainz,
  openLibrary,
  scryfall,
  tmdb,
} from "../lib/lookup/sources";

const answer = (body: unknown, status = 200) =>
  vi.fn(() =>
    Promise.resolve(
      typeof body === "string"
        ? new Response(body, { status })
        : Response.json(body, { status })
    )
  ) as unknown as typeof fetch;

describe("product lookups", () => {
  test("Open Library finds a book by ISBN", async () => {
    const fetcher = answer({
      docs: [
        {
          author_name: ["Paulo Coelho"],
          cover_i: 42,
          first_publish_year: 1988,
          key: "/works/OL123W",
          title: "The Alchemist",
        },
      ],
    });
    const [book] = await openLibrary({ barcode: "9780061122415" }, fetcher);
    expect(book).toMatchObject({
      barcode: "9780061122415",
      creator: "Paulo Coelho",
      details: { Author: "Paulo Coelho" },
      id: "OL123W",
      image: "https://covers.openlibrary.org/b/id/42-L.jpg",
      source: "openlibrary",
      year: 1988,
    });
    expect(String(vi.mocked(fetcher).mock.calls[0]?.[0])).toContain(
      "isbn=9780061122415"
    );
  });

  test("MusicBrainz names the artist and format, with the cover", async () => {
    const [release] = await musicBrainz(
      { creator: "Miles Davis", text: "Kind of Blue" },
      answer({
        releases: [
          {
            "artist-credit": [{ name: "Miles Davis" }],
            barcode: "886975197129",
            date: "1959-08-17",
            id: "abc",
            media: [{ format: '12" Vinyl' }],
            title: "Kind of Blue",
          },
        ],
      })
    );
    expect(release).toMatchObject({
      barcode: "886975197129",
      details: { Artist: "Miles Davis", Format: '12" Vinyl' },
      image: "https://coverartarchive.org/release/abc/front-500",
      year: 1959,
    });
  });

  test("Discogs splits its 'Artist - Title'", async () => {
    const [release] = await discogs(
      { barcode: "886975197129" },
      answer({
        results: [
          {
            barcode: ["8 86975 19712 9"],
            format: ["Vinyl"],
            id: 99,
            title: "Miles Davis - Kind Of Blue",
            uri: "/release/99",
            year: "2008",
          },
        ],
      }),
      "token-123456"
    );
    expect(release).toMatchObject({
      barcode: "886975197129",
      creator: "Miles Davis",
      id: "99",
      title: "Kind Of Blue",
      url: "https://www.discogs.com/release/99",
    });
  });

  test("TMDB, BoardGameGeek and Scryfall", async () => {
    const [film] = await tmdb(
      { text: "Paris, Texas" },
      answer({
        results: [
          {
            id: 655,
            poster_path: "/p.jpg",
            release_date: "1984-05-19",
            title: "Paris, Texas",
          },
        ],
      }),
      "read-token-0000000000000"
    );
    expect(film).toMatchObject({ id: "movie/655", year: 1984 });

    const [game] = await boardGameGeek(
      { text: "Catan" },
      answer(
        '<items><item type="boardgame" id="13"><name type="primary" value="CATAN &amp; friends"/><yearpublished value="1995"/></item></items>'
      ),
      "bgg-token-000"
    );
    expect(game).toMatchObject({
      id: "13",
      title: "CATAN & friends",
      year: 1995,
    });

    expect(await scryfall({ text: "nothing" }, answer({}, 404))).toEqual([]);
  });

  test("sources without a key are skipped, and a failing one doesn't stop the rest", async () => {
    expect(sourcesFor("games", {}).map(([name]) => name)).toEqual([]);
    expect(sourcesFor("music", {}).map(([name]) => name)).toEqual([
      "musicbrainz",
    ]);

    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        url.includes("openlibrary")
          ? Response.json({ docs: [{ key: "/works/OL1W", title: "A book" }] })
          : new Response("down", { status: 503 })
      )
    ) as unknown as typeof fetch;
    const result = await lookupProduct(
      "books",
      { text: "A book" },
      {},
      fetcher
    );
    expect(result.candidates.map((item) => item.source)).toEqual([
      "openlibrary",
    ]);
    expect(result.failed).toEqual(["googlebooks"]);
  });
});
