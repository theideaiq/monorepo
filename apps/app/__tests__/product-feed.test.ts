import { describe, expect, test } from "vitest";
import {
  escapeXml,
  type FeedProduct,
  productFeedXml,
} from "@/lib/product-feed";

const variant = { active: true, barcode: null, images: [], stock_count: 0 };

const product: FeedProduct = {
  category: { name_ar: "موسيقى", name_en: "Music" },
  condition: "used",
  currency: "IQD",
  description_ar: null,
  description_en: "A classic <album> & more",
  details: { Artist: "Fairuz" },
  id: "p1",
  images: ["products/a.jpg"],
  name_ar: "اسم",
  name_en: "Best of",
  slug: "best-of",
  variants: [
    { ...variant, barcode: "0602537000000", price: 45_000, stock_count: 2 },
    { ...variant, price: 15_000 },
    { ...variant, active: false, price: 9000 },
  ],
};

const single: FeedProduct = {
  ...product,
  id: "p2",
  slug: "single",
  variants: [{ ...variant, barcode: "0602537000000", price: 20_000 }],
};

const hidden: FeedProduct = {
  ...product,
  id: "p3",
  variants: [{ ...variant, active: false, price: 1000 }],
};

const options = {
  imageUrl: (path: string) => `https://cdn.example/${path}`,
  locale: "en" as const,
  siteUrl: "https://theideaiq.com",
  title: "The IDEA store",
};

describe("productFeedXml", () => {
  const xml = productFeedXml([product, single, hidden], options);

  test("one item per product with a live version, by product id", () => {
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain("<g:id>p1</g:id>");
    expect(xml).not.toContain("<g:id>p3</g:id>");
  });

  test("Google's required fields, escaped", () => {
    expect(xml).toContain("<g:title>Best of</g:title>");
    expect(xml).toContain(
      "<g:description>A classic &lt;album&gt; &amp; more</g:description>"
    );
    expect(xml).toContain(
      "<g:link>https://theideaiq.com/store/best-of</g:link>"
    );
    expect(xml).toContain(
      "<g:image_link>https://cdn.example/products/a.jpg</g:image_link>"
    );
    expect(xml).toContain("<g:price>15000 IQD</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:condition>used</g:condition>");
    expect(xml).toContain("<g:brand>Fairuz</g:brand>");
  });

  test("a GTIN only for a product with one version", () => {
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xml).toContain("<g:gtin>0602537000000</g:gtin>");
    expect(xml.match(/<g:gtin>/g)).toHaveLength(1);
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  test("Arabic links keep /ar", () => {
    expect(productFeedXml([single], { ...options, locale: "ar" })).toContain(
      "<g:link>https://theideaiq.com/ar/store/single</g:link>"
    );
  });

  test("escapeXml drops control characters", () => {
    expect(escapeXml("a\u0001b'\"")).toBe("ab&apos;&quot;");
  });
});
