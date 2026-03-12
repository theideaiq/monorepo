'use client';

import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const productUrl = `${baseUrl}/product/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.seller,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'IQD',
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
  };

  if (product.rating > 0) {
    // @ts-expect-error
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: 1, // Fallback as actual count isn't in Product model currently
    };
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for JSON-LD
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
