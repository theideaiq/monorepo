import { describe, expect, it } from "vitest";
import { appLink, appProductLink } from "@/lib/links";
import { productJsonLd, productSpecs } from "@/lib/product";
import { parseStoreQuery, storeQueryString } from "@/lib/store-params";

describe("parseStoreQuery", () => {
  it("uses defaults for missing or invalid values", () => {
    expect(parseStoreQuery({})).toEqual({
      category: undefined,
      page: 1,
      q: undefined,
      sort: "newest",
    });
    expect(
      parseStoreQuery({ category: "Bad Slug!", page: "-3", sort: "cheapest" })
    ).toEqual({ category: undefined, page: 1, q: undefined, sort: "newest" });
  });

  it("keeps valid values and caps the page", () => {
    expect(
      parseStoreQuery({
        category: "gaming",
        page: ["2", "9"],
        q: "  ps5  ",
        sort: "price-asc",
      })
    ).toEqual({ category: "gaming", page: 2, q: "ps5", sort: "price-asc" });
    expect(parseStoreQuery({ page: "99999" }).page).toBe(500);
  });

  it("builds search strings without defaults", () => {
    const query = parseStoreQuery({ category: "books", q: "قصة" });
    expect(storeQueryString(query)).toBe(
      `?category=books&q=${encodeURIComponent("قصة").replace(/%20/g, "+")}`
    );
    expect(storeQueryString(query, { category: undefined, q: undefined })).toBe(
      ""
    );
    expect(storeQueryString(query, { page: 3, sort: "price-desc" })).toContain(
      "sort=price-desc&page=3"
    );
  });
});

describe("app links", () => {
  it("points at the app's query-parameter routes", () => {
    expect(appProductLink("https://app.theideaiq.com/", "ar", "ps5-slim")).toBe(
      "https://app.theideaiq.com/ar/store/product?slug=ps5-slim"
    );
    expect(appLink("https://app.theideaiq.com", "en", "/events")).toBe(
      "https://app.theideaiq.com/en/events"
    );
  });
});

describe("product helpers", () => {
  const product = {
    category: { id: "c", name_ar: "ألعاب", name_en: "Gaming", slug: "gaming" },
    compare_at_price: 780_000,
    condition: "new",
    currency: "IQD",
    description_ar: "وصف",
    description_en: "A console",
    kind: "sale",
    name_ar: "بلايستيشن",
    name_en: "PlayStation 5",
    price: 720_000,
    product_variants: [],
    slug: "playstation-5-slim",
    stock_count: 0,
  } as unknown as Parameters<typeof productJsonLd>[0]["product"];

  it("lists flat specifications only", () => {
    expect(
      productSpecs({
        Nested: { a: 1 },
        Storage: "1 TB",
        Warranty: "",
        Year: 2026,
      })
    ).toEqual([
      ["Storage", "1 TB"],
      ["Year", "2026"],
    ]);
    expect(productSpecs(null)).toEqual([]);
    expect(productSpecs(["a"])).toEqual([]);
  });

  it("describes the product and its offer for search engines", () => {
    const data = productJsonLd({
      images: ["https://example.com/a.png"],
      locale: "en",
      name: "PlayStation 5",
      pageUrl: "https://theideaiq.com/en/store/playstation-5-slim",
      product,
    }) as unknown as Record<string, Record<string, unknown>>;
    expect(data.category).toBe("Gaming");
    expect(data.offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
      price: 720_000,
      priceCurrency: "IQD",
    });
  });

  it("has no purchase offer for rentals", () => {
    const data = productJsonLd({
      images: [],
      locale: "ar",
      name: "x",
      pageUrl: "https://theideaiq.com/ar/store/x",
      product: { ...product, kind: "rental" },
    });
    expect("offers" in data).toBe(false);
  });
});
