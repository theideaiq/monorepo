import { parseCsv } from "@repo/commerce/csv";
import { describe, expect, test } from "vitest";
import {
  MAX_UPLOAD_ROWS,
  parseUpload,
  UPLOAD_COLUMNS,
  uploadTemplateCsv,
} from "@/lib/listing-upload";

const categories = new Set(["music", "games", "books"]);

describe("listing upload", () => {
  test("the template has every column and parses cleanly", () => {
    expect(parseCsv(uploadTemplateCsv())[0]).toEqual([...UPLOAD_COLUMNS]);
    const sheet = parseUpload(uploadTemplateCsv(), categories);
    expect(sheet.problem).toBeUndefined();
    expect(sheet.rows.map((row) => row.errors)).toEqual([[], []]);
    expect(sheet.rows[0]?.product).toBeUndefined();
    expect(sheet.rows[1]?.product).toEqual({
      categorySlug: "books",
      nameAr: "كتاب لم يعرضه أحد",
      nameEn: "A book nobody has listed",
    });
  });

  test("reads aliases, grouped numbers, ISBN dashes and default condition", () => {
    const sheet = parseUpload(
      'ISBN,Price,Copies,Condition\n0-441-17271-x,"14,750",2,\n978 0441 172719,٩٧٥٠,1,Open box\n',
      categories
    );
    expect(sheet.rows).toMatchObject([
      { barcode: "044117271x", condition: "new", price: 14_750, quantity: 2 },
      {
        barcode: "9780441172719",
        condition: "open_box",
        line: 3,
        price: 9750,
        quantity: 1,
      },
    ]);
  });

  test("reports what's wrong on each row", () => {
    const sheet = parseUpload(
      [
        "barcode,condition,price,quantity,category",
        ",new,9750,1,",
        "123456789012,mint,100,1000,toys",
        "123456789012,new,9750,0,",
        "123456789012,new,9750,1,",
      ].join("\n"),
      categories
    );
    expect(sheet.rows.map((row) => row.errors)).toEqual([
      ["missingBarcode"],
      [
        "invalidCondition",
        "invalidPrice",
        "invalidQuantity",
        "unknownCategory",
      ],
      [],
      ["duplicate"],
    ]);
  });

  test("refuses files without the needed columns, empty or too long", () => {
    expect(parseUpload("", categories).problem).toBe("empty");
    expect(
      parseUpload("barcode,price,quantity\n,,\n", categories).problem
    ).toBe("empty");
    expect(parseUpload("barcode,price\n1,2\n", categories).problem).toBe(
      "missingColumns"
    );
    const long = [
      "barcode,price,quantity",
      ...Array.from(
        { length: MAX_UPLOAD_ROWS + 1 },
        (_, index) => `${100_000_000 + index},9750,1`
      ),
    ].join("\n");
    expect(parseUpload(long, categories).problem).toBe("tooManyRows");
  });
});
