import { localized } from "@repo/commerce";
import type { ProductDetail } from "@repo/commerce/catalog";
import type { Product, WithContext } from "@repo/seo/json-ld";

const isPrimitive = (value: unknown): value is string | number | boolean =>
  ["string", "number", "boolean"].includes(typeof value);

/**
 * A product's specifications (`details`) as label/value pairs. Only flat
 * values are shown; nested objects and empty values are skipped.
 */
export const productSpecs = (details: unknown): [string, string][] => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }
  return Object.entries(details as Record<string, unknown>)
    .filter(
      (entry): entry is [string, string | number | boolean] =>
        isPrimitive(entry[1]) && String(entry[1]).trim() !== ""
    )
    .map(([label, value]) => [label, String(value)]);
};

const CONDITIONS = {
  new: "https://schema.org/NewCondition",
  open_box: "https://schema.org/NewCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
  used: "https://schema.org/UsedCondition",
} as const satisfies Record<ProductDetail["condition"], string>;

interface ProductJsonLdInput {
  images: string[];
  locale: string;
  name: string;
  pageUrl: string;
  product: ProductDetail;
}

/** schema.org Product data; rentals have no purchase offer. */
export const productJsonLd = ({
  images,
  locale,
  name,
  pageUrl,
  product,
}: ProductJsonLdInput): WithContext<Product> => {
  const description = localized(product, "description", locale);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    ...(description ? { description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.category
      ? { category: localized(product.category, "name", locale) }
      : {}),
    name,
    sku: product.product_variants[0]?.sku ?? product.slug,
    url: pageUrl,
    ...(product.kind === "sale"
      ? {
          offers: {
            "@type": "Offer" as const,
            availability:
              product.stock_count > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            itemCondition: CONDITIONS[product.condition],
            price: product.price,
            priceCurrency: product.currency,
            url: pageUrl,
          },
        }
      : {}),
  };
};
