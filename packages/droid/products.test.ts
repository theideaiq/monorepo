import { describe, expect, test } from "vitest";
import { productHtml, summarizeProduct } from "./products";
import { product } from "./testing";

const variant = (
  id: string,
  label: string,
  price: number,
  position: number
) => ({
  active: true,
  attributes: { Format: label },
  id,
  label_ar: label,
  label_en: label,
  position,
  price,
});

describe("product summaries", () => {
  test("a product with one version shows its price", () => {
    const summary = summarizeProduct(product(), "en", "https://theideaiq.com");
    expect(summary.price).toBe(summarizeProduct(product(), "en", "x").price);
    expect(summary.variants).toEqual([]);
  });

  test("several versions show their names and a 'from' price", () => {
    const summary = summarizeProduct(
      product({
        price: 39_750,
        variants: [
          variant("v2", "Vinyl", 69_750, 1),
          variant("v1", "CD", 39_750, 0),
        ],
      }),
      "en",
      "https://theideaiq.com"
    );
    expect(summary.variants).toEqual(["CD", "Vinyl"]);
    expect(summary.price?.startsWith("From ")).toBe(true);
    expect(productHtml(summary, "en").split("\n")[1]).toBe("CD · Vinyl");
  });
});
