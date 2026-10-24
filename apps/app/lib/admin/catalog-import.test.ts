import { describe, expect, test } from "vitest";
import {
  buildPreview,
  chunk,
  type ExistingProduct,
  IMPORT_COLUMNS,
  importItems,
  parseCsv,
  parseSheet,
  parseWholeNumber,
  slugify,
  templateCsv,
} from "./catalog-import";

const categories = [
  { id: "c-vinyl", slug: "vinyl" },
  { id: "c-books", slug: "books" },
];
const categorySlugs = new Set(categories.map((category) => category.slug));

const adele: ExistingProduct = {
  category_id: "c-vinyl",
  compare_at_price: null,
  condition: "new",
  description_ar: "وصف",
  description_en: "25 by Adele.",
  details: { Artist: "Adele", Format: "Vinyl" },
  images: ["https://coverartarchive.org/release-group/x/front-500"],
  kind: "sale",
  name_ar: "أديل – 25",
  name_en: "Adele – 25 (Vinyl)",
  price: 69_750,
  slug: "adele-25-vinyl",
  status: "active",
  stock_count: 1,
};

const sheet = (...lines: string[]) => lines.join("\n");

describe("parseCsv", () => {
  test("reads quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","two\nlines"\r\n')).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "two\nlines"],
    ]);
  });

  test("reads tab-separated text pasted from a spreadsheet", () => {
    expect(parseCsv("slug\tprice\nps5\t700000")).toEqual([
      ["slug", "price"],
      ["ps5", "700000"],
    ]);
  });

  test("keeps empty trailing cells", () => {
    expect(parseCsv("a,b,\n1,,")).toEqual([
      ["a", "b", ""],
      ["1", "", ""],
    ]);
  });
});

describe("cells", () => {
  test("slugify makes web-safe slugs from English names", () => {
    expect(slugify("Beyoncé – RENAISSANCE (Vinyl)")).toBe(
      "beyonce-renaissance-vinyl"
    );
    expect(slugify("Taylor’s Version & More")).toBe("taylors-version-and-more");
    expect(slugify("العادات الذرية")).toBe("");
  });

  test("parseWholeNumber reads grouped, Arabic-Indic and decimal-zero numbers", () => {
    expect(parseWholeNumber("64,750")).toBe(64_750);
    expect(parseWholeNumber("٦٤٬٧٥٠")).toBe(64_750);
    expect(parseWholeNumber("64750.00")).toBe(64_750);
    expect(parseWholeNumber("12.5")).toBeNull();
    expect(parseWholeNumber("-3")).toBeNull();
    expect(parseWholeNumber("abc")).toBeNull();
  });

  test("the template has every column and parses cleanly", () => {
    const parsed = parseSheet(templateCsv(), categorySlugs);
    expect(parseCsv(templateCsv())[0]).toEqual([...IMPORT_COLUMNS]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.errors).toEqual([]);
    expect(parsed.rows[0]?.slug).toBe("adele-25-vinyl");
  });
});

describe("parseSheet", () => {
  test("validates rows and maps barcode, SKU and details columns", () => {
    const { rows, unknownColumns } = parseSheet(
      sheet(
        "Name EN,name_ar,Kind,category,price,Stock,status,condition,barcode,sku,details.Artist,image_urls,notes",
        'Kate Bush – Hounds of Love (Vinyl),كيت بوش,sale,vinyl,"49,750",2,Active,open box,123,SKU-1,Kate Bush,https://coverartarchive.org/a/front-500 | catalog/products/b.jpg,ignored'
      ),
      categorySlugs
    );
    expect(unknownColumns).toEqual(["notes"]);
    expect(rows).toEqual([
      {
        errors: [],
        fields: {
          category: "vinyl",
          condition: "open_box",
          details: { Artist: "Kate Bush", Barcode: "123", SKU: "SKU-1" },
          images: [
            "https://coverartarchive.org/a/front-500",
            "catalog/products/b.jpg",
          ],
          kind: "sale",
          name_ar: "كيت بوش",
          name_en: "Kate Bush – Hounds of Love (Vinyl)",
          price: 49_750,
          status: "active",
          stock_count: 2,
        },
        line: 2,
        slug: "kate-bush-hounds-of-love-vinyl",
      },
    ]);
  });

  test("reports invalid cells by column", () => {
    const { rows } = parseSheet(
      sheet(
        "slug,kind,category,price,compare_at_price,stock,status,condition,image_urls",
        "Bad Slug!,lease,toys,free,1.5,-1,live,mint,https://example.com/a.jpg"
      ),
      categorySlugs
    );
    expect(rows[0]?.errors.map((error) => error.code)).toEqual([
      "invalidSlug",
      "invalidKind",
      "invalidStatus",
      "invalidCondition",
      "unknownCategory",
      "invalidPrice",
      "invalidCompareAt",
      "invalidStock",
      "invalidImage",
    ]);
  });

  test("flags duplicate slugs, skips blank lines and numbers lines", () => {
    const { rows } = parseSheet(
      sheet("slug,price", "ps5,1", "", "ps5,2", "ps4,3"),
      categorySlugs
    );
    expect(
      rows.map((row) => [row.line, row.errors.map((e) => e.code)])
    ).toEqual([
      [2, ["duplicateSlug"]],
      [4, ["duplicateSlug"]],
      [5, []],
    ]);
  });

  test("needs a name or slug column, and rows", () => {
    expect(parseSheet("price,stock\n1,2", categorySlugs).problem).toBe(
      "noNameOrSlug"
    );
    expect(parseSheet("slug,price\n", categorySlugs).problem).toBe("empty");
    expect(parseSheet("", categorySlugs).problem).toBe("empty");
  });

  test("a row without slug or English name has no slug", () => {
    const { rows } = parseSheet(sheet("slug,name_ar", ",كتاب"), categorySlugs);
    expect(rows[0]?.errors).toEqual([{ code: "missingSlug", column: "slug" }]);
  });
});

describe("buildPreview", () => {
  const preview = (text: string, existing: ExistingProduct[] = [adele]) =>
    buildPreview(parseSheet(text, categorySlugs).rows, existing, categories);

  test("new products need both names and a price", () => {
    const [ok, missing] = preview(
      sheet(
        "slug,name_en,name_ar,price,category",
        "new-one,New,جديد,1000,books",
        "new-two,New two,,,"
      )
    );
    expect(ok).toMatchObject({
      item: {
        category: "books",
        name_ar: "جديد",
        name_en: "New",
        price: 1000,
        slug: "new-one",
      },
      status: "new",
    });
    expect(missing).toMatchObject({
      errors: [
        { code: "missingForNew", column: "name_ar" },
        { code: "missingForNew", column: "price" },
      ],
      status: "error",
    });
  });

  test("blank cells never overwrite; only differing fields are sent", () => {
    const [row] = preview(
      sheet(
        "slug,name_en,name_ar,price,stock,category,description_en,barcode,details.Artist",
        "adele-25-vinyl,,,65000,1,vinyl,,0889,Adele"
      )
    );
    expect(row).toEqual({
      changed: ["price", "details"],
      fields: expect.any(Object),
      item: {
        details: { Barcode: "0889" },
        price: 65_000,
        slug: "adele-25-vinyl",
      },
      line: 2,
      slug: "adele-25-vinyl",
      status: "changed",
    });
  });

  test("detects category and image changes", () => {
    const [row] = preview(
      sheet(
        "slug,category,image_urls",
        "adele-25-vinyl,books,https://covers.openlibrary.org/b/id/1-L.jpg"
      )
    );
    expect(row).toMatchObject({
      changed: ["category", "images"],
      status: "changed",
    });
  });

  test("a row matching the catalog is unchanged", () => {
    expect(
      preview(
        sheet(
          "slug,name_en,price,status,category,details.Artist",
          "adele-25-vinyl,Adele – 25 (Vinyl),69750,active,vinyl,Adele"
        )
      )
    ).toEqual([{ line: 2, slug: "adele-25-vinyl", status: "unchanged" }]);
  });

  test("the merged compare-at price must stay above the price", () => {
    const withCompareAt = { ...adele, compare_at_price: 80_000 };
    expect(
      preview(sheet("slug,price", "adele-25-vinyl,90000"), [withCompareAt])[0]
    ).toMatchObject({
      errors: [{ code: "compareAtNotHigher" }],
      status: "error",
    });
    expect(
      preview(
        sheet("slug,price,compare_at_price", "adele-25-vinyl,90000,95000"),
        [withCompareAt]
      )[0]
    ).toMatchObject({ status: "changed" });
  });

  test("invalid rows stay errors", () => {
    expect(
      preview(sheet("slug,price", "adele-25-vinyl,free"))[0]
    ).toMatchObject({ status: "error" });
  });
});

describe("batches", () => {
  test("importItems keeps new and changed rows", () => {
    const rows = buildPreview(
      parseSheet(
        sheet(
          "slug,name_en,name_ar,price",
          "adele-25-vinyl,,,1",
          "fresh,Fresh,طازج,5",
          "adele-25-vinyl-copy,,,"
        ),
        categorySlugs
      ).rows,
      [adele],
      categories
    );
    expect(importItems(rows).map((item) => item.slug)).toEqual([
      "adele-25-vinyl",
      "fresh",
    ]);
  });

  test("chunk splits into batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
