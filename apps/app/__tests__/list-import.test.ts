import { describe, expect, test } from "vitest";
import { listSourceOf, parseListFile } from "@/lib/list-import";

describe("parseListFile", () => {
  test("Goodreads: the to-read shelf, with ISBN-13s", () => {
    const csv = [
      "Book Id,Title,Author,ISBN,ISBN13,Year Published,Original Publication Year,Exclusive Shelf",
      '1,The Alchemist,Paulo Coelho,"=""0061122416""","=""9780061122415""",2006,1988,to-read',
      "2,Dune,Frank Herbert,,,1990,1965,read",
    ].join("\n");
    expect(parseListFile(csv)).toEqual({
      items: [
        {
          barcode: "9780061122415",
          creator: "Paulo Coelho",
          external_ids: { goodreads: "1" },
          kind: "book",
          source: "goodreads",
          title: "The Alchemist",
          year: 1988,
        },
      ],
      source: "goodreads",
    });
  });

  test("The StoryGraph: to-read, first author", () => {
    const csv = [
      "Title,Authors,ISBN/UID,Format,Read Status",
      '"Good Omens","Terry Pratchett, Neil Gaiman",9780060853976,paperback,to-read',
      "Emma,Jane Austen,,ebook,read",
    ].join("\r\n");
    expect(parseListFile(csv)?.items).toEqual([
      {
        barcode: "9780060853976",
        creator: "Terry Pratchett",
        external_ids: {},
        kind: "book",
        source: "storygraph",
        title: "Good Omens",
      },
    ]);
  });

  test("Letterboxd: the watchlist", () => {
    const csv =
      "﻿Date,Name,Year,Letterboxd URI\n2026-01-02,Parasite,2019,https://boxd.it/hTha\n";
    expect(parseListFile(csv)?.items).toEqual([
      {
        external_ids: { letterboxd: "https://boxd.it/hTha" },
        kind: "film",
        source: "letterboxd",
        title: "Parasite",
        year: 2019,
      },
    ]);
  });

  test("other files are refused", () => {
    expect(parseListFile("a,b\n1,2")).toBeNull();
    expect(listSourceOf([])).toBeNull();
  });
});
