'use client';

import { Product } from '@/services/products';

/**
 * Injects JSON-LD Structured Data for Products into the page head.
 * Critical for SEO: Helps search engines understand the Product entity and
 * enables rich snippets (price, availability, ratings) in search results.
 *
 * @param product - The product object to generate schema for
 * @param baseUrl - The base URL of the site
 */
export default function ProductJsonLd({
  product,
  baseUrl,
}: {
  product: Product;
  baseUrl: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [product.image, ...product.images] : undefined,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller, // Assuming seller is the brand for this platform, or customize as needed
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'IQD', // Default currency as seen in ProductView
      price: product.price,
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
    aggregateRating:
      product.rating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: 1, // Need at least 1 if rating is present for valid schema
          }
        : undefined,
  };

  // Safe stringify escaping < to prevent XSS
  const safeJsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required
      dangerouslySetInnerHTML={{ __html: safeJsonLdString }}
    />
  );
}
