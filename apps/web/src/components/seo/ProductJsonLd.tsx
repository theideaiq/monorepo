'use client';

import type { Product } from '@/services/products';
import { webEnv } from '@repo/env/web';

/**
 * Injects Product JSON-LD Structured Data into the page head.
 * Critical for SEO: Helps search engines understand the product details and enables rich snippets.
 */
export default function ProductJsonLd({ product }: { product: Product }) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;

  // Create offers array if product has variants, otherwise single offer
  const offers = product.variants && product.variants.length > 0
    ? product.variants.map((variant) => ({
        '@type': 'Offer',
        priceCurrency: 'IQD',
        price: variant.price,
        itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        sku: variant.sku,
        url: `${baseUrl}/product/${product.slug}?variant=${variant.id}`,
      }))
    : {
        '@type': 'Offer',
        priceCurrency: 'IQD',
        price: product.price,
        itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${baseUrl}/product/${product.slug}`,
      };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [product.image, ...(product.images || [])] : undefined,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller,
    },
    offers,
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.details?.reviewCount || 1, // Providing a default reviewCount
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
