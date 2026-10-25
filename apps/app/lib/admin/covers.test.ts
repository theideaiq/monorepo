import { describe, expect, test, vi } from "vitest";
import {
  coverQuery,
  coverStrategy,
  createThrottle,
  findBookCovers,
  findCovers,
  findMusicCovers,
  findWikipediaCovers,
  LookupError,
} from "./covers";

const MBID = "5537624c-3d2f-4f5c-8099-df916082c85c";
const noThrottle = () => Promise.resolve();

/** A fetch stand-in answering by URL prefix; unknown URLs get a 404. */
const mockFetch = (routes: Record<string, unknown>) =>
  vi.fn((input: string | URL | Request) => {
    const url = String(input);
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => url.startsWith(prefix));
    const body = match === undefined ? undefined : routes[match];
    if (body instanceof Response) {
      return Promise.resolve(body);
    }
    return Promise.resolve(
      body === undefined
        ? new Response("", { status: 404 })
        : Response.json(body)
    );
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("coverStrategy", () => {
  test("maps categories to sources", () => {
    expect(coverStrategy("music")).toBe("music");
    expect(coverStrategy("books")).toBe("books");
    expect(coverStrategy("gaming")).toBe("wikipedia");
    expect(coverStrategy(null)).toBe("wikipedia");
  });
});

describe("coverQuery", () => {
  test("music: artist from details, title without the format", () => {
    expect(
      coverQuery(
        {
          details: { Artist: "Olivia Rodrigo" },
          name_en: "Olivia Rodrigo – GUTS (Signed Card) (Cassette)",
        },
        "music"
      )
    ).toEqual({ creator: "Olivia Rodrigo", title: "GUTS" });
  });

  test("music: artist from the name when details have none", () => {
    expect(
      coverQuery({ details: {}, name_en: "Adele – 25 (Vinyl)" }, "music")
    ).toEqual({ creator: "Adele", title: "25" });
    expect(
      coverQuery({ details: {}, name_en: "Portals (Vinyl)" }, "music")
    ).toEqual({ creator: undefined, title: "Portals" });
  });

  test("books: title first, author from details or the name", () => {
    expect(
      coverQuery(
        { details: {}, name_en: "Atomic Habits – James Clear" },
        "books"
      )
    ).toEqual({ creator: "James Clear", title: "Atomic Habits" });
    expect(
      coverQuery(
        { details: { Author: "J. Clear" }, name_en: "Atomic Habits" },
        "books"
      )
    ).toEqual({ creator: "J. Clear", title: "Atomic Habits" });
  });

  test("others: the name without platform or format", () => {
    expect(
      coverQuery(
        { details: null, name_en: "Cyberpunk 2077 (PS5)" },
        "wikipedia"
      )
    ).toEqual({ title: "Cyberpunk 2077" });
  });
});

describe("findMusicCovers", () => {
  test("searches release groups and links their front covers", async () => {
    const fetcher = mockFetch({
      "https://musicbrainz.org/ws/2/release-group/": {
        "release-groups": [
          {
            "artist-credit": [{ name: "Adele" }],
            "first-release-date": "2015-11-20",
            id: MBID,
            score: 100,
            title: "25",
          },
          { id: "not-an-id", score: 100, title: "Bad" },
          {
            id: "11111111-2222-3333-4444-555555555555",
            score: 20,
            title: "Weak",
          },
        ],
      },
    });
    const throttle = vi.fn(noThrottle);
    const covers = await findMusicCovers(
      { creator: "Adele", title: '25 "Deluxe"' },
      { fetch: fetcher, throttle }
    );

    expect(throttle).toHaveBeenCalledOnce();
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("fmt")).toBe("json");
    expect(url.searchParams.get("query")).toBe(
      'releasegroup:"25 \\"Deluxe\\"" AND artist:"Adele"'
    );
    expect(covers).toEqual([
      {
        source: "coverartarchive",
        subtitle: "Adele · 2015",
        title: "25",
        url: `https://coverartarchive.org/release-group/${MBID}/front-500`,
      },
    ]);
  });

  test("reports a failing service", async () => {
    const fetcher = mockFetch({
      "https://musicbrainz.org/": new Response("", { status: 503 }),
    });
    await expect(
      findMusicCovers({ title: "25" }, { fetch: fetcher, throttle: noThrottle })
    ).rejects.toBeInstanceOf(LookupError);
  });
});

describe("findBookCovers", () => {
  test("keeps results with a cover id", async () => {
    const fetcher = mockFetch({
      "https://openlibrary.org/search.json": {
        docs: [
          { title: "No cover" },
          {
            author_name: ["James Clear"],
            cover_i: 12_345,
            first_publish_year: 2018,
            title: "Atomic Habits",
          },
        ],
      },
    });
    const covers = await findBookCovers(
      { creator: "James Clear", title: "Atomic Habits" },
      { fetch: fetcher }
    );
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("title")).toBe("Atomic Habits");
    expect(url.searchParams.get("author")).toBe("James Clear");
    expect(covers).toEqual([
      {
        source: "openlibrary",
        subtitle: "James Clear · 2018",
        title: "Atomic Habits",
        url: "https://covers.openlibrary.org/b/id/12345-L.jpg",
      },
    ]);
  });
});

describe("findWikipediaCovers", () => {
  test("uses the exact page, then search results, skipping SVGs and disambiguations", async () => {
    const fetcher = mockFetch({
      "https://en.wikipedia.org/api/rest_v1/page/summary/Cyberpunk": {
        title: "Cyberpunk",
        type: "disambiguation",
      },
      "https://en.wikipedia.org/api/rest_v1/page/summary/Cyberpunk_2077": {
        description: "2020 video game",
        originalimage: {
          source:
            "https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077.jpg",
        },
        title: "Cyberpunk 2077",
        type: "standard",
      },
      "https://en.wikipedia.org/api/rest_v1/page/summary/Cyberpunk_2077%3A_Phantom_Liberty":
        {
          originalimage: { source: "https://upload.wikimedia.org/a/logo.svg" },
          thumbnail: {
            source: "https://upload.wikimedia.org/a/320px-logo.png",
          },
          title: "Cyberpunk 2077: Phantom Liberty",
          type: "standard",
        },
      "https://en.wikipedia.org/w/rest.php/v1/search/title": {
        pages: [
          { key: "Cyberpunk_2077" },
          { key: "Cyberpunk_2077:_Phantom_Liberty" },
          { key: "Cyberpunk" },
        ],
      },
    });
    const covers = await findWikipediaCovers(
      { title: "Cyberpunk 2077" },
      { fetch: fetcher }
    );
    expect(covers.map((cover) => cover.url)).toEqual([
      "https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077.jpg",
      "https://upload.wikimedia.org/a/320px-logo.png",
    ]);
  });

  test("ignores images on other hosts", async () => {
    const fetcher = mockFetch({
      "https://en.wikipedia.org/api/rest_v1/page/summary/": {
        originalimage: { source: "https://example.com/a.jpg" },
        title: "X",
        type: "standard",
      },
      "https://en.wikipedia.org/w/rest.php/": { pages: [] },
    });
    expect(
      await findWikipediaCovers({ title: "X" }, { fetch: fetcher })
    ).toEqual([]);
  });
});

describe("findCovers", () => {
  test("picks the source from the category", async () => {
    const fetcher = mockFetch({
      "https://openlibrary.org/search.json": {
        docs: [{ cover_i: 7, title: "Frankenstein in Baghdad" }],
      },
    });
    const covers = await findCovers(
      { details: {}, name_en: "Frankenstein in Baghdad – Ahmed Saadawi" },
      "books",
      { fetch: fetcher }
    );
    expect(covers.map((cover) => cover.url)).toEqual([
      "https://covers.openlibrary.org/b/id/7-L.jpg",
    ]);
  });
});

describe("createThrottle", () => {
  test("spaces calls by the interval", async () => {
    let clock = 0;
    const waits: number[] = [];
    const throttle = createThrottle(
      1000,
      () => clock,
      (ms) => {
        waits.push(ms);
        clock += ms;
        return Promise.resolve();
      }
    );
    await Promise.all([throttle(), throttle(), throttle()]);
    expect(waits).toEqual([1000, 1000]);
    clock += 5000;
    await throttle();
    expect(waits).toEqual([1000, 1000]);
  });
});
