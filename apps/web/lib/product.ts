import { localized } from "@repo/commerce";
import type { ProductDetail } from "@repo/commerce/catalog";
import type {
  Product,
  Review as ReviewLd,
  WithContext,
} from "@repo/seo/json-ld";
import { BEST_RATING, type Rating, type Review } from "./reviews";

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

/** At most this many reviews are marked up, all of them shown on the page. */
export const MAX_JSON_LD_REVIEWS = 5;

interface ProductJsonLdInput {
  images: string[];
  locale: string;
  name: string;
  pageUrl: string;
  product: ProductDetail;
  /** Average and count of published reviews; null when there are none. */
  rating?: Rating | null;
  /** The latest published reviews, as listed on the page. */
  reviews?: Review[];
}

type NamedReview = Review & { author_name: string };

const reviewJsonLd = (review: NamedReview): ReviewLd => ({
  "@type": "Review",
  author: { "@type": "Person", name: review.author_name.trim() },
  datePublished: review.created_at.slice(0, 10),
  ...(review.comment?.trim() ? { reviewBody: review.comment.trim() } : {}),
  reviewRating: {
    "@type": "Rating",
    bestRating: BEST_RATING,
    ratingValue: review.rating,
    worstRating: 1,
  },
});

/**
 * Review markup under Google's review snippet rules: real, published
 * customer reviews only, an aggregate only when at least one review exists,
 * and individual reviews only with a named author (the same reviews the page
 * shows).
 */
const ratingJsonLd = (rating?: Rating | null, reviews: Review[] = []) => {
  if (!rating || rating.count < 1) {
    return {};
  }
  const named = reviews
    .filter((review): review is NamedReview =>
      Boolean(review.author_name?.trim())
    )
    .slice(0, MAX_JSON_LD_REVIEWS)
    .map(reviewJsonLd);
  return {
    aggregateRating: {
      "@type": "AggregateRating" as const,
      bestRating: BEST_RATING,
      ratingValue: rating.average,
      reviewCount: rating.count,
      worstRating: 1,
    },
    ...(named.length > 0 ? { review: named } : {}),
  };
};

/** schema.org Product data; rentals have no purchase offer. */
export const productJsonLd = ({
  images,
  locale,
  name,
  pageUrl,
  product,
  rating,
  reviews,
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
            ...(product.seller
              ? {
                  seller: {
                    "@type": "Organization" as const,
                    name: product.seller,
                  },
                }
              : {}),
            url: pageUrl,
          },
        }
      : {}),
    ...ratingJsonLd(rating, reviews),
  };
};
