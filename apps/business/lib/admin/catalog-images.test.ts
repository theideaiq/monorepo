import { catalogImagePatterns } from "@repo/next-config";
import { describe, expect, test } from "vitest";
import { productSchema } from "./catalog";
import {
  isCatalogImage,
  isRemoteCatalogImage,
  REMOTE_IMAGE_HOSTS,
} from "./catalog-images";

describe("catalog images", () => {
  test("the remote hosts match what next/image may optimise", () => {
    const hosts = catalogImagePatterns().map((pattern) =>
      pattern.hostname.replace("*.", "")
    );
    expect(new Set(hosts)).toEqual(new Set(REMOTE_IMAGE_HOSTS));
  });

  test("accepts cover-art links and storage paths", () => {
    expect(
      isRemoteCatalogImage(
        "https://coverartarchive.org/release-group/x/front-500"
      )
    ).toBe(true);
    expect(isRemoteCatalogImage("https://ia800.us.archive.org/a.jpg")).toBe(
      true
    );
    expect(isCatalogImage("products/2026/a b.jpg")).toBe(true);
  });

  test("rejects other hosts, plain http, credentials and path tricks", () => {
    expect(isRemoteCatalogImage("https://example.com/a.jpg")).toBe(false);
    expect(isRemoteCatalogImage("https://evilcoverartarchive.org/a.jpg")).toBe(
      false
    );
    expect(isRemoteCatalogImage("http://covers.openlibrary.org/a.jpg")).toBe(
      false
    );
    expect(
      isRemoteCatalogImage("https://user:pw@upload.wikimedia.org/a.jpg")
    ).toBe(false);
    expect(isCatalogImage("../secret")).toBe(false);
    expect(isCatalogImage("javascript:alert(1)")).toBe(false);
  });

  test("the product form keeps linked covers", () => {
    const parsed = productSchema.safeParse({
      condition: "new",
      images: [
        "https://covers.openlibrary.org/b/id/1-L.jpg",
        "products/a.jpg",
        "",
      ],
      kind: "sale",
      nameAr: "كتاب",
      nameEn: "Book",
      price: "1000",
      seller: "The IDEA",
      slug: "book",
      status: "draft",
      stock: "1",
    });
    expect(parsed.success && parsed.data.images).toEqual([
      "https://covers.openlibrary.org/b/id/1-L.jpg",
      "products/a.jpg",
    ]);
    expect(
      productSchema.safeParse({
        condition: "new",
        images: ["https://example.com/a.jpg"],
        kind: "sale",
        nameAr: "كتاب",
        nameEn: "Book",
        price: "1000",
        seller: "The IDEA",
        slug: "book",
        status: "draft",
        stock: "1",
      }).success
    ).toBe(false);
  });
});
