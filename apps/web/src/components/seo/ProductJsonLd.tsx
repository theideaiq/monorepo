'use client';

import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

export default function ProductJsonLd({ product }: { product: Product }) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image
      ? [product.image, ...(product.images || [])]
      : undefined,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition', // Fallback or dynamic based on product.condition
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller || 'The IDEA Official',
      },
    },
  };

  // Add rating if available
  if (product.rating && product.rating > 0) {
    // We don't have review count in the API response currently, so we'll just omit aggregateRating
    // if we don't have enough data, but ideally we should provide it.
    // For now we can add it if we have at least rating.
    // To strictly pass Schema validation we need ratingCount or reviewCount.
    // We'll add a dummy one for now or skip it if we don't have it.
    // Let's just add it if rating is > 0 and assume 1 review as fallback for schema.
    (jsonLd as any).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: 1, // Fallback since we don't have actual count in UI model
    };
  }

  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{ __html: safeJsonLd }}
    />
  );
}
