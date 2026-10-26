import { describe, expect, it } from "vitest";
import { appLink, pagePath } from "@/lib/links";
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

describe("links", () => {
  it("builds locale-prefixed paths here and URLs on The IDEA Business", () => {
    expect(pagePath("ar", "/plus", { plan: "p1" })).toBe("/ar/plus?plan=p1");
    expect(appLink("https://business.theideaiq.com/", "en", "/invoices")).toBe(
      "https://business.theideaiq.com/invoices"
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

  it("marks up a product with several versions as a group of offers", () => {
    const variant = (
      id: string,
      label: string,
      price: number,
      stock: number
    ) => ({
      active: true,
      attributes: { Format: label },
      barcode: id === "v2" ? "0602527000000" : null,
      id,
      images: [],
      label_ar: label,
      label_en: label,
      position: id === "v1" ? 0 : 1,
      price,
      sku: null,
      stock_count: stock,
    });
    const data = productJsonLd({
      images: [],
      locale: "en",
      name: "Adele – 21",
      pageUrl: "https://theideaiq.com/store/adele-21",
      product: {
        ...product,
        product_variants: [
          variant("v1", "CD", 39_750, 1),
          variant("v2", "Vinyl", 69_750, 0),
        ],
        slug: "adele-21",
      } as unknown as Parameters<typeof productJsonLd>[0]["product"],
    }) as unknown as Record<string, unknown> & {
      hasVariant: Record<string, unknown>[];
    };
    expect(data["@type"]).toBe("ProductGroup");
    expect(data.productGroupID).toBe("adele-21");
    expect(data.hasVariant).toHaveLength(2);
    expect(data.hasVariant[1]).toMatchObject({
      gtin: "0602527000000",
      name: "Adele – 21 – Vinyl",
      offers: {
        availability: "https://schema.org/OutOfStock",
        price: 69_750,
      },
      url: "https://theideaiq.com/store/adele-21?variant=vinyl",
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

  const review = (id: string, author: string | null, rating = 5) => ({
    author_name: author,
    comment: ` Great ${id} `,
    created_at: "2026-10-20T09:30:00Z",
    id,
    photos: [],
    rating,
    verified_purchase: true,
  });

  it("has no rating markup without reviews", () => {
    const base = {
      images: [],
      locale: "en",
      name: "PlayStation 5",
      pageUrl: "https://theideaiq.com/en/store/playstation-5-slim",
      product,
    };
    for (const extra of [
      {},
      { rating: null },
      { rating: { average: 0, count: 0 }, reviews: [] },
    ]) {
      const data = productJsonLd({ ...base, ...extra });
      expect("aggregateRating" in data).toBe(false);
      expect("review" in data).toBe(false);
    }
  });

  it("marks up the rating and up to five named reviews", () => {
    const data = productJsonLd({
      images: [],
      locale: "en",
      name: "PlayStation 5",
      pageUrl: "https://theideaiq.com/en/store/playstation-5-slim",
      product,
      rating: { average: 4.6, count: 12 },
      reviews: [
        review("1", "Sara"),
        review("2", null),
        review("3", "  "),
        review("4", "Ali", 4),
        review("5", "Noor"),
        review("6", "Zaid"),
        review("7", "Huda"),
        review("8", "Omar"),
      ],
    }) as unknown as Record<string, unknown>;
    expect(data.aggregateRating).toEqual({
      "@type": "AggregateRating",
      bestRating: 5,
      ratingValue: 4.6,
      reviewCount: 12,
      worstRating: 1,
    });
    const reviews = data.review as Record<string, unknown>[];
    expect(reviews.map((r) => (r.author as { name: string }).name)).toEqual([
      "Sara",
      "Ali",
      "Noor",
      "Zaid",
      "Huda",
    ]);
    expect(reviews[1]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Ali" },
      datePublished: "2026-10-20",
      reviewBody: "Great 4",
      reviewRating: {
        "@type": "Rating",
        bestRating: 5,
        ratingValue: 4,
        worstRating: 1,
      },
    });
  });

  it("keeps the aggregate when no review has an author name", () => {
    const data = productJsonLd({
      images: [],
      locale: "ar",
      name: "x",
      pageUrl: "https://theideaiq.com/ar/store/x",
      product: { ...product, kind: "rental" },
      rating: { average: 3, count: 1 },
      reviews: [{ ...review("1", null), comment: null }],
    });
    expect("aggregateRating" in data).toBe(true);
    expect("review" in data).toBe(false);
  });
});
