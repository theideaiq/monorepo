import { describe, expect, test } from "vitest";
import { catalogImagePatterns, isLocalUrl } from "./index";

describe("catalog images", () => {
  test("allows the Supabase catalog bucket and the cover-art sources", () => {
    const patterns = catalogImagePatterns("https://abc.supabase.co");
    expect(patterns[0]).toEqual({
      hostname: "abc.supabase.co",
      pathname: "/storage/v1/object/public/**",
      port: "",
      protocol: "https",
    });
    expect(patterns.map((p) => p.hostname)).toEqual([
      "abc.supabase.co",
      "coverartarchive.org",
      "archive.org",
      "*.archive.org",
      "covers.openlibrary.org",
      "upload.wikimedia.org",
      "books.google.com",
      "i.discogs.com",
      "images.igdb.com",
      "image.tmdb.org",
      "cards.scryfall.io",
      "images.pokemontcg.io",
    ]);
  });

  test("works without Supabase and spots the local stack", () => {
    expect(catalogImagePatterns()).toHaveLength(11);
    expect(isLocalUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalUrl("https://abc.supabase.co")).toBe(false);
    expect(isLocalUrl(undefined)).toBe(false);
  });
});
